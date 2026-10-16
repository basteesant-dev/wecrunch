import Link from "next/link";
import { PageHeader, Table, btn, fmtDate, inputCls } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE_SIZE = 100;

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  await requireUser("audit.read");
  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action.trim() : "";
  const user = typeof sp.user === "string" ? sp.user.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    ...(action ? { action: { startsWith: action } } : {}),
    ...(user ? { userEmail: { contains: user, mode: "insensitive" as const } } : {}),
  };
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.auditLog.count({ where }),
  ]);
  const qs = (p: number) => new URLSearchParams({ ...(action ? { action } : {}), ...(user ? { user } : {}), page: String(p) }).toString();
  return (
    <>
      <PageHeader title="Audit log" description="Sign-ins, content changes, publishing, exports and enquiry access." />
      <form method="get" className="mb-4 flex flex-wrap gap-3 text-sm">
        <input name="action" defaultValue={action} placeholder="Action, e.g. page. or enquiry.export" aria-label="Action" className={inputCls} />
        <input name="user" defaultValue={user} placeholder="User email" aria-label="User" className={inputCls} />
        <button type="submit" className={btn.secondary}>
          Filter
        </button>
      </form>
      <Table head={["When", "User", "Action", "Item", "Details", "IP"]} empty={rows.length ? undefined : "Nothing logged yet."}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap px-4 py-2">{fmtDate(r.createdAt)}</td>
            <td className="px-4 py-2">{r.userEmail ?? "—"}</td>
            <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
            <td className="px-4 py-2 text-xs">
              {r.entityType === "FranchiseEnquiry" && r.entityId ? (
                <Link href={`/admin/enquiries/${r.entityId}`} className="text-blue-700 hover:underline">
                  enquiry
                </Link>
              ) : r.entityType === "Page" && r.entityId ? (
                <Link href={`/admin/pages/${r.entityId}`} className="text-blue-700 hover:underline">
                  page
                </Link>
              ) : (
                r.entityType ?? "—"
              )}
            </td>
            <td className="max-w-md truncate px-4 py-2">{r.summary}</td>
            <td className="px-4 py-2 font-mono text-xs">{r.ip}</td>
          </tr>
        ))}
      </Table>
      <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-sm">
        {page > 1 && (
          <Link href={`/admin/audit-logs?${qs(page - 1)}`} className={btn.secondary}>
            Newer
          </Link>
        )}
        <span>
          {total.toLocaleString("en-IN")} entries · page {page}
        </span>
        {page * PAGE_SIZE < total && (
          <Link href={`/admin/audit-logs?${qs(page + 1)}`} className={btn.secondary}>
            Older
          </Link>
        )}
      </nav>
    </>
  );
}
