import Link from "next/link";
import { Badge, PageHeader, Table, btn, fmtDate, inputCls } from "@/components/admin/ui";
import { filterQuery, filterWhere, readFilters } from "@/lib/admin/enquiry-filters";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ENQUIRY_STATUSES, STATUS_LABELS } from "@/lib/enquiries";
import { can } from "@/lib/permissions";

const PAGE_SIZE = 50;
const STATUS_COLOR = { NEW: "blue", CONTACTED: "slate", QUALIFIED: "amber", FOLLOW_UP: "amber", CONVERTED: "green", CLOSED: "red" } as const;

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const user = await requireUser("enquiries.read");
  const sp = await searchParams;
  const f = readFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = filterWhere(f);
  const [rows, total, states, owners] = await Promise.all([
    db.franchiseEnquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { owner: { select: { name: true } } } }),
    db.franchiseEnquiry.count({ where }),
    db.state.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.adminUser.findMany({ where: { role: { in: ["SUPER_ADMIN", "ENQUIRY_MANAGER"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Franchise enquiries"
        description={`${total.toLocaleString("en-IN")} matching enquiries`}
        actions={
          can(user.role, "enquiries.export") && (
            <a href={`/api/admin/enquiries/export?${filterQuery(f)}`} className={btn.secondary}>
              Export CSV
            </a>
          )
        }
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <label className="flex-1 basis-56">
          <span className="mb-1 block font-medium">Search</span>
          <input name="q" defaultValue={f.q} placeholder="Name, email, phone or city" className={`${inputCls} w-full`} />
        </label>
        <label>
          <span className="mb-1 block font-medium">Status</span>
          <select name="status" defaultValue={f.status ?? ""} className={inputCls}>
            <option value="">Any</option>
            {ENQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-medium">State</span>
          <select name="state" defaultValue={f.state ?? ""} className={inputCls}>
            <option value="">Any</option>
            <option value="none">Not given</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-medium">Owner</span>
          <select name="owner" defaultValue={f.owner ?? ""} className={inputCls}>
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-medium">From</span>
          <input type="date" name="from" defaultValue={f.from} className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block font-medium">To</span>
          <input type="date" name="to" defaultValue={f.to} className={inputCls} />
        </label>
        <label className="flex items-center gap-2 pb-2">
          <input type="checkbox" name="due" value="1" defaultChecked={!!f.due} /> Follow-up due
        </label>
        <button type="submit" className={btn.primary}>
          Filter
        </button>
        <Link href="/admin/enquiries" className="pb-2 text-blue-700 hover:underline">
          Reset
        </Link>
      </form>

      <Table head={["Received", "Name", "Mobile", "State / city", "Source", "Status", "Owner", "Follow-up"]} empty={rows.length ? undefined : "No enquiries match these filters."}>
        {rows.map((e) => (
          <tr key={e.id} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(e.createdAt)}</td>
            <td className="px-4 py-2.5">
              <Link href={`/admin/enquiries/${e.id}`} className="font-medium hover:underline">
                {e.fullName}
              </Link>
              <span className="block text-xs text-slate-500">{e.email}</span>
            </td>
            <td className="whitespace-nowrap px-4 py-2.5">{e.phone}</td>
            <td className="px-4 py-2.5">
              {e.stateName ?? "—"}
              {e.city && <span className="block text-xs text-slate-500">{e.city}</span>}
            </td>
            <td className="px-4 py-2.5 text-xs">
              <span className="font-medium text-slate-900">{e.utmSource || e.trafficSource || "—"}</span>
              {e.utmMedium && <span className="block text-[11px] text-slate-500">{e.utmMedium}</span>}
              {e.utmCampaign && <span className="block text-[10px] text-slate-400 truncate max-w-[140px]" title={e.utmCampaign}>Camp: {e.utmCampaign}</span>}
            </td>
            <td className="px-4 py-2.5">
              <Badge color={STATUS_COLOR[e.status]}>{STATUS_LABELS[e.status]}</Badge>
            </td>
            <td className="px-4 py-2.5">{e.owner?.name ?? "—"}</td>
            <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(e.followUpAt, false)}</td>
          </tr>
        ))}
      </Table>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`/admin/enquiries?${filterQuery(f, { page: String(page - 1) })}`} className={btn.secondary}>
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`/admin/enquiries?${filterQuery(f, { page: String(page + 1) })}`} className={btn.secondary}>
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
