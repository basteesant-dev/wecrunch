import Link from "next/link";
import { Badge, PageHeader, Table, btn, fmtDate } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/permissions";

export default async function UsersPage() {
  await requireUser("users.manage");
  const users = await db.adminUser.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader
        title="Users"
        description="Super admins manage everything. Content editors manage the website. Enquiry managers see and work leads only."
        actions={
          <Link href="/admin/users/new" className={btn.primary}>
            New user
          </Link>
        }
      />
      <Table head={["Name", "Email", "Role", "Status", "Last sign-in"]}>
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5">
              <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                {u.name}
              </Link>
            </td>
            <td className="px-4 py-2.5">{u.email}</td>
            <td className="px-4 py-2.5">{ROLE_LABELS[u.role]}</td>
            <td className="px-4 py-2.5">
              {!u.isActive ? <Badge color="red">Inactive</Badge> : u.lockedUntil && u.lockedUntil > new Date() ? <Badge color="amber">Locked</Badge> : <Badge color="green">Active</Badge>}
            </td>
            <td className="px-4 py-2.5">{fmtDate(u.lastLoginAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
