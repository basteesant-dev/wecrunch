import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { PageSnapshot } from "@/lib/resolve";
import { validateSection } from "@/lib/sections/validate";

type Tx = Prisma.TransactionClient;

/** Builds a publishable snapshot from the draft, re-validating every section. */
export async function buildSnapshot(pageId: string, tx: Tx = db) {
  const page = await tx.page.findUniqueOrThrow({
    where: { id: pageId },
    include: { sections: { orderBy: { sortOrder: "asc" }, include: { states: { select: { id: true } } } } },
  });
  const errors: string[] = [];
  const sections = page.sections.map((s, i) => {
    const v = validateSection(s.type, s.content, s.settings);
    if (!v.ok) errors.push(`Section ${i + 1} (${s.type}): ${v.error}`);
    return {
      id: s.id,
      type: s.type,
      key: s.key,
      isHidden: s.isHidden,
      content: (v.ok ? v.content : s.content) as Record<string, unknown>,
      settings: (v.ok ? v.settings : s.settings) as Record<string, unknown>,
      stateIds: s.states.map((st) => st.id).sort(),
    };
  });
  const snapshot: PageSnapshot = {
    page: {
      title: page.title,
      slug: page.slug,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      ogImageId: page.ogImageId,
      canonicalUrl: page.canonicalUrl,
      noIndex: page.noIndex,
      phone: page.phone,
      whatsapp: page.whatsapp,
      email: page.email,
    },
    sections,
  };
  return { snapshot, errors };
}

async function nextVersion(tx: Tx, pageId: string) {
  const last = await tx.pageRevision.findFirst({ where: { pageId }, orderBy: { version: "desc" }, select: { version: true } });
  return (last?.version ?? 0) + 1;
}

async function makeLive(tx: Tx, pageId: string, revisionId: string) {
  await tx.pageRevision.updateMany({ where: { pageId, status: "PUBLISHED", id: { not: revisionId } }, data: { status: "SUPERSEDED" } });
  await tx.pageRevision.update({ where: { id: revisionId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  await tx.page.update({ where: { id: pageId }, data: { status: "PUBLISHED" } });
}

/** Publishes the current draft now, or schedules it when publishAt is in the future. */
export async function publishPage(pageId: string, userId: string | null, opts: { publishAt?: Date | null; note?: string } = {}) {
  return db.$transaction(async (tx) => {
    const { snapshot, errors } = await buildSnapshot(pageId, tx);
    if (errors.length) return { ok: false as const, errors };
    const scheduled = opts.publishAt && opts.publishAt.getTime() > Date.now();
    if (scheduled) {
      // Only one pending schedule per page: a newer schedule replaces the older one.
      await tx.pageRevision.updateMany({ where: { pageId, status: "SCHEDULED" }, data: { status: "SUPERSEDED" } });
    }
    const revision = await tx.pageRevision.create({
      data: {
        pageId,
        version: await nextVersion(tx, pageId),
        status: scheduled ? "SCHEDULED" : "SUPERSEDED",
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        note: opts.note,
        publishAt: scheduled ? opts.publishAt : null,
        createdById: userId,
      },
    });
    if (!scheduled) await makeLive(tx, pageId, revision.id);
    return { ok: true as const, revision, scheduled: !!scheduled };
  });
}

export async function unpublishPage(pageId: string) {
  await db.$transaction([
    db.pageRevision.updateMany({ where: { pageId, status: { in: ["PUBLISHED", "SCHEDULED"] } }, data: { status: "SUPERSEDED" } }),
    db.page.update({ where: { id: pageId }, data: { status: "UNPUBLISHED" } }),
  ]);
}

/** Replaces the draft sections with those from a snapshot. */
async function restoreDraft(tx: Tx, pageId: string, snapshot: PageSnapshot) {
  const existingStates = new Set((await tx.state.findMany({ select: { id: true } })).map((s) => s.id));
  await tx.pageSection.deleteMany({ where: { pageId } });
  for (const [i, s] of snapshot.sections.entries()) {
    await tx.pageSection.create({
      data: {
        pageId,
        type: s.type,
        key: s.key,
        isHidden: s.isHidden,
        sortOrder: i,
        content: s.content as Prisma.InputJsonValue,
        settings: s.settings as Prisma.InputJsonValue,
        states: { connect: s.stateIds.filter((id) => existingStates.has(id)).map((id) => ({ id })) },
      },
    });
  }
  const p = snapshot.page;
  await tx.page.update({
    where: { id: pageId },
    data: { title: p.title, seoTitle: p.seoTitle, seoDescription: p.seoDescription, ogImageId: p.ogImageId, canonicalUrl: p.canonicalUrl, noIndex: p.noIndex, phone: p.phone, whatsapp: p.whatsapp, email: p.email },
  });
}

/**
 * Rolls back to an earlier revision: its snapshot is published again as a new
 * version (history stays linear and auditable) and copied into the draft.
 */
export async function rollbackTo(revisionId: string, userId: string | null) {
  return db.$transaction(async (tx) => {
    const old = await tx.pageRevision.findUniqueOrThrow({ where: { id: revisionId } });
    const snapshot = old.snapshot as unknown as PageSnapshot;
    const revision = await tx.pageRevision.create({
      data: {
        pageId: old.pageId,
        version: await nextVersion(tx, old.pageId),
        status: "SUPERSEDED",
        snapshot: old.snapshot as Prisma.InputJsonValue,
        note: `Rollback to version ${old.version}`,
        createdById: userId,
      },
    });
    await makeLive(tx, old.pageId, revision.id);
    await restoreDraft(tx, old.pageId, snapshot);
    return revision;
  });
}

/** Promotes scheduled revisions whose time has come. Called by /api/cron. */
export async function promoteScheduled(now = new Date()) {
  const due = await db.pageRevision.findMany({ where: { status: "SCHEDULED", publishAt: { lte: now } }, select: { id: true, pageId: true } });
  for (const r of due) await db.$transaction((tx) => makeLive(tx, r.pageId, r.id));
  return due.length;
}

/** True when the draft differs from the live version (or nothing is live yet). */
export async function hasUnpublishedChanges(pageId: string) {
  const [{ snapshot }, live] = await Promise.all([
    buildSnapshot(pageId),
    db.pageRevision.findFirst({ where: { pageId, status: "PUBLISHED" }, select: { snapshot: true } }),
  ]);
  return !live || stableJson(snapshot) !== stableJson(live.snapshot);
}

// JSONB does not preserve key order, so compare with keys sorted.
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}
