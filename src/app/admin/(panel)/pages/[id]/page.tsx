import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { FieldsEditor } from "@/components/admin/FieldsEditor";
import { PreviewPanel } from "@/components/admin/PreviewPanel";
import { Badge, Card, PageHeader, fmtDate, inputCls } from "@/components/admin/ui";
import { loadMediaPreviews } from "@/lib/admin/refs";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasUnpublishedChanges } from "@/lib/pages";
import { SECTION_TYPES, isSectionType } from "@/lib/sections/registry";
import { PAGE_FIELDS } from "../fields";
import {
  addSection,
  deletePage,
  deleteSection,
  duplicatePage,
  duplicateSection,
  moveSection,
  publish,
  rollback,
  savePageMeta,
  toggleSection,
  unpublish,
} from "../actions";

const iconBtn = "grid size-8 place-items-center rounded border border-slate-200 bg-white text-sm hover:bg-slate-100 disabled:opacity-30";

function summary(content: Record<string, unknown>) {
  return String(content.heading || content.tagline || content.eyebrow || (Array.isArray(content.items) ? `${content.items.length} items` : "") || "");
}

export default async function PageBuilder({ params }: PageProps<"/admin/pages/[id]">) {
  await requireUser("content.manage");
  const { id } = await params;
  const page = await db.page.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { sortOrder: "asc" }, include: { states: { select: { name: true } } } },
      revisions: { orderBy: { version: "desc" }, take: 20, include: { createdBy: { select: { name: true } } } },
      states: { select: { name: true } },
    },
  });
  if (!page) notFound();
  const [states, media] = await Promise.all([
    db.state.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    loadMediaPreviews(PAGE_FIELDS, { ogImageId: page.ogImageId ?? "" }),
  ]);
  const live = page.revisions.find((r) => r.status === "PUBLISHED");
  const dirty = await hasUnpublishedChanges(page.id);
  const url = page.slug === "home" ? "/" : `/${page.slug}`;

  return (
    <>
      <PageHeader
        title={page.title}
        back={{ href: "/admin/pages", label: "Pages" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <a href={url} target="_blank" rel="noopener" className="font-mono text-blue-700 hover:underline">
              {url} ↗
            </a>
            {page.status === "PUBLISHED" ? <Badge color="green">Live v{live?.version}</Badge> : <Badge color={page.status === "DRAFT" ? "slate" : "red"}>{page.status.toLowerCase()}</Badge>}
            {dirty && page.status === "PUBLISHED" && <Badge color="amber">Draft has unpublished changes</Badge>}
            {page.states.length > 0 && <span>Landing page for {page.states.length} state(s)</span>}
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Card title="Sections">
            <ol className="space-y-2">
              {page.sections.map((s, i) => {
                const label = isSectionType(s.type) ? SECTION_TYPES[s.type].label : s.type;
                return (
                  <li key={s.id} className={`flex items-center gap-3 rounded-md border p-3 ${s.isHidden ? "border-dashed border-slate-300 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}>
                    <span className="w-6 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/pages/${page.id}/sections/${s.id}`} className="font-medium hover:underline">
                        {label}
                      </Link>
                      <p className="truncate text-sm text-slate-500">{summary(s.content as Record<string, unknown>) || "—"}</p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        {s.states.length ? <Badge color="blue">Only: {s.states.map((st) => st.name).join(", ")}</Badge> : <Badge>All visitors</Badge>}
                        {s.key && <Badge color="amber">Override key: {s.key}</Badge>}
                        {s.isHidden && <Badge color="red">Hidden</Badge>}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <form action={moveSection.bind(null, page.id, s.id, -1)}>
                        <button className={iconBtn} disabled={i === 0} aria-label={`Move ${label} up`}>↑</button>
                      </form>
                      <form action={moveSection.bind(null, page.id, s.id, 1)}>
                        <button className={iconBtn} disabled={i === page.sections.length - 1} aria-label={`Move ${label} down`}>↓</button>
                      </form>
                      <form action={duplicateSection.bind(null, page.id, s.id)}>
                        <button className={iconBtn} aria-label={`Duplicate ${label}`} title="Duplicate">⧉</button>
                      </form>
                      <form action={toggleSection.bind(null, page.id, s.id)}>
                        <button className={iconBtn} aria-label={s.isHidden ? `Show ${label}` : `Hide ${label}`} title={s.isHidden ? "Show" : "Hide"}>
                          {s.isHidden ? "◌" : "◉"}
                        </button>
                      </form>
                      <form action={deleteSection.bind(null, page.id, s.id)}>
                        <SubmitButton variant="secondary" className="!min-h-8 !px-2 text-red-700" confirm={`Delete the ${label} section?`}>
                          ✕
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
              {!page.sections.length && <li className="py-6 text-center text-sm text-slate-500">This page has no sections yet. Add one below.</li>}
            </ol>
            <ActionForm action={addSection.bind(null, page.id)} className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
              <label htmlFor="new-section" className="text-sm font-medium">
                Add section
              </label>
              <select id="new-section" name="type" required className={`${inputCls} flex-1`} defaultValue="">
                <option value="" disabled>
                  Choose a section type…
                </option>
                {Object.entries(SECTION_TYPES).map(([key, t]) => (
                  <option key={key} value={key}>
                    {t.label} — {t.description}
                  </option>
                ))}
              </select>
              <SubmitButton>Add</SubmitButton>
            </ActionForm>
          </Card>

          <Card title={dirty ? "Publish" : "Publish (no changes since the live version)"}>
            <ActionForm action={publish.bind(null, page.id)} className="space-y-3">
              <label className="block text-sm font-medium">
                Note (optional)
                <input name="note" maxLength={300} className={`${inputCls} mt-1 block w-full`} placeholder="What changed?" />
              </label>
              <label className="block text-sm font-medium">
                Schedule for (India time, optional)
                <input name="publishAt" type="datetime-local" className={`${inputCls} mt-1 block`} />
              </label>
              <div className="flex flex-wrap gap-2">
                <SubmitButton>Publish</SubmitButton>
              </div>
            </ActionForm>
            {page.status === "PUBLISHED" && page.slug !== "home" && (
              <ActionForm action={unpublish.bind(null, page.id)} className="mt-4 border-t border-slate-200 pt-4">
                <SubmitButton variant="secondary" confirm="Take this page offline?">
                  Unpublish
                </SubmitButton>
              </ActionForm>
            )}
          </Card>

          <Card title="Version history">
            <ol className="divide-y divide-slate-100 text-sm">
              {page.revisions.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="w-10 font-mono">v{r.version}</span>
                  <Badge color={r.status === "PUBLISHED" ? "green" : r.status === "SCHEDULED" ? "blue" : "slate"}>
                    {r.status === "SCHEDULED" ? `scheduled ${fmtDate(r.publishAt)}` : r.status.toLowerCase()}
                  </Badge>
                  <span className="text-slate-500">
                    {fmtDate(r.createdAt)} · {r.createdBy?.name ?? "system"}
                  </span>
                  {r.note && <span className="w-full text-slate-600 sm:w-auto">{r.note}</span>}
                  {r.status !== "PUBLISHED" && (
                    <ActionForm action={rollback.bind(null, page.id, r.id)} className="ml-auto">
                      <SubmitButton variant="secondary" confirm={`Publish version ${r.version} again and load it into the draft?`}>
                        Roll back to this
                      </SubmitButton>
                    </ActionForm>
                  )}
                </li>
              ))}
              {!page.revisions.length && <li className="py-3 text-slate-500">Not published yet.</li>}
            </ol>
          </Card>

          <Card title="Page settings & SEO">
            <ActionForm action={savePageMeta.bind(null, page.id)}>
              <FieldsEditor
                fields={PAGE_FIELDS}
                media={media}
                initial={{
                  title: page.title,
                  slug: page.slug,
                  seoTitle: page.seoTitle ?? "",
                  seoDescription: page.seoDescription ?? "",
                  ogImageId: page.ogImageId ?? "",
                  canonicalUrl: page.canonicalUrl ?? "",
                  noIndex: page.noIndex,
                  phone: page.phone ?? "",
                  whatsapp: page.whatsapp ?? "",
                  email: page.email ?? "",
                }}
              />
              <div className="mt-4">
                <SubmitButton>Save settings</SubmitButton>
              </div>
            </ActionForm>
          </Card>

          <div className="flex flex-wrap gap-3">
            <form action={duplicatePage.bind(null, page.id)}>
              <SubmitButton variant="secondary">Duplicate page</SubmitButton>
            </form>
            {page.slug !== "home" && (
              <ActionForm action={deletePage.bind(null, page.id)}>
                <SubmitButton variant="danger" confirm="Delete this page and all of its versions? This cannot be undone.">
                  Delete page
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card title="Draft preview">
            <PreviewPanel pageId={page.id} states={states} />
          </Card>
        </div>
      </div>
    </>
  );
}
