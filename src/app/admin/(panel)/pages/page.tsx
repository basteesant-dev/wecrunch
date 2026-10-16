import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Badge, Card, PageHeader, Table, fmtDate, inputCls } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasUnpublishedChanges } from "@/lib/pages";
import { createPage } from "./actions";

export default async function PagesList({ searchParams }: PageProps<"/admin/pages">) {
  await requireUser("content.manage");
  const { deleted } = await searchParams;
  const pages = await db.page.findMany({
    orderBy: [{ slug: "asc" }],
    include: {
      revisions: { where: { status: { in: ["PUBLISHED", "SCHEDULED"] } }, select: { status: true, version: true, createdAt: true, publishAt: true } },
      sections: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
      states: { select: { id: true } },
    },
  });
  const dirtyIds = new Set((await Promise.all(pages.map(async (p) => ((await hasUnpublishedChanges(p.id)) ? p.id : null)))).filter(Boolean));
  return (
    <>
      <PageHeader title="Pages" description="Pages are built from sections. Edit a draft, preview it per device and state, then publish." />
      {deleted && (
        <p role="status" className="mb-4">
          <Badge color="green">Page deleted</Badge>
        </p>
      )}
      <Table head={["Page", "URL", "Status", "Used by states", "Last edited", ""]}>
        {pages.map((p) => {
          const live = p.revisions.find((r) => r.status === "PUBLISHED");
          const scheduled = p.revisions.find((r) => r.status === "SCHEDULED");
          const lastEdit = new Date(Math.max(p.updatedAt.getTime(), p.sections[0]?.updatedAt.getTime() ?? 0));
          const dirty = live && dirtyIds.has(p.id);
          return (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5">
                <Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline">
                  {p.title}
                </Link>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs">/{p.slug === "home" ? "" : p.slug}</td>
              <td className="space-x-1 px-4 py-2.5">
                {p.status === "PUBLISHED" ? <Badge color="green">Live v{live?.version}</Badge> : <Badge color={p.status === "DRAFT" ? "slate" : "red"}>{p.status.toLowerCase()}</Badge>}
                {dirty && <Badge color="amber">Unpublished changes</Badge>}
                {scheduled && <Badge color="blue">Scheduled {fmtDate(scheduled.publishAt)}</Badge>}
              </td>
              <td className="px-4 py-2.5">{p.states.length || "—"}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(lastEdit)}</td>
              <td className="px-4 py-2.5 text-right">
                <Link href={`/admin/pages/${p.id}`} className="text-blue-700 hover:underline">
                  Edit
                </Link>
              </td>
            </tr>
          );
        })}
      </Table>
      <Card title="New page" className="mt-8 max-w-xl">
        <ActionForm action={createPage} className="flex flex-wrap items-end gap-3">
          <label className="flex-1 text-sm font-medium">
            Title
            <input name="title" required className={`${inputCls} mt-1 block w-full`} />
          </label>
          <label className="flex-1 text-sm font-medium">
            Slug
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="e.g. franchise-faq" className={`${inputCls} mt-1 block w-full`} />
          </label>
          <SubmitButton>Create page</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
