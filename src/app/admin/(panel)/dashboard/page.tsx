import Link from "next/link";
import { Badge, Card, PageHeader, Table, fmtDate } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/enquiries";
import { can } from "@/lib/permissions";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-400">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString("en-IN")}</p>
    </Link>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/admin/dashboard">) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const leads = can(user, "enquiries.read");
  const content = can(user, "content.manage");
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [newCount, weekCount, dueCount, recent, published, drafts, scheduled, activeStates] = await Promise.all([
    leads ? db.franchiseEnquiry.count({ where: { status: "NEW" } }) : 0,
    leads ? db.franchiseEnquiry.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }) : 0,
    leads ? db.franchiseEnquiry.count({ where: { followUpAt: { lte: endOfToday }, status: { notIn: ["CONVERTED", "CLOSED"] } } }) : 0,
    leads ? db.franchiseEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 8 }) : [],
    content ? db.page.count({ where: { status: "PUBLISHED" } }) : 0,
    content ? db.page.count({ where: { status: { not: "PUBLISHED" } } }) : 0,
    content ? db.pageRevision.count({ where: { status: "SCHEDULED" } }) : 0,
    content ? db.state.count({ where: { status: "ACTIVE" } }) : 0,
  ]);

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} description="What needs attention today." />
      {denied && (
        <p role="alert" className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You do not have permission for that module. Ask a super admin to grant it on the Users page.
        </p>
      )}
      {leads && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat label="New enquiries" value={newCount} href="/admin/enquiries?status=NEW" />
          <Stat label="Enquiries in the last 7 days" value={weekCount} href="/admin/enquiries" />
          <Stat label="Follow-ups due today" value={dueCount} href="/admin/enquiries?due=1" />
        </div>
      )}
      {content && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Published pages" value={published} href="/admin/pages" />
          <Stat label="Draft or offline pages" value={drafts} href="/admin/pages" />
          <Stat label="Scheduled publications" value={scheduled} href="/admin/pages" />
          <Stat label="Active states" value={activeStates} href="/admin/states" />
        </div>
      )}
      {leads && (
        <Card title="Latest enquiries">
          <Table head={["Received", "Name", "State", "City", "Status"]} empty={recent.length ? undefined : "No enquiries yet."}>
            {recent.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(e.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/enquiries/${e.id}`} className="font-medium hover:underline">
                    {e.fullName}
                  </Link>
                </td>
                <td className="px-4 py-2.5">{e.stateName ?? "—"}</td>
                <td className="px-4 py-2.5">{e.city ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge color={e.status === "NEW" ? "blue" : e.status === "CONVERTED" ? "green" : "slate"}>{STATUS_LABELS[e.status]}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
