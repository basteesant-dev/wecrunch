import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Card, PageHeader, inputCls } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/permissions";
import { saveUser, unlockUser } from "../actions";

export default async function UserEdit({ params }: PageProps<"/admin/users/[id]">) {
  await requireUser("users.manage");
  const { id } = await params;
  const isNew = id === "new";
  const u = isNew ? null : await db.adminUser.findUnique({ where: { id } });
  if (!isNew && !u) notFound();
  const field = `${inputCls} mt-1 block w-full`;
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title={u?.name ?? "New user"} back={{ href: "/admin/users", label: "Users" }} />
      <Card>
        <ActionForm action={saveUser.bind(null, u?.id ?? null)} className="space-y-4 text-sm">
          <label className="block font-medium">
            Name
            <input name="name" required defaultValue={u?.name} className={field} />
          </label>
          <label className="block font-medium">
            Email
            <input name="email" type="email" required defaultValue={u?.email} autoComplete="off" className={field} />
          </label>
          <label className="block font-medium">
            Role
            <select name="role" defaultValue={u?.role ?? "CONTENT_EDITOR"} className={field}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="isActive" defaultChecked={u?.isActive ?? true} /> Active
          </label>
          <label className="block font-medium">
            {isNew ? "Password" : "New password (leave empty to keep the current one)"}
            <input name="password" type="password" autoComplete="new-password" required={isNew} className={field} />
            <span className="mt-1 block text-xs font-normal text-slate-500">At least 12 characters, with upper and lower case letters and a number.</span>
          </label>
          <SubmitButton>{isNew ? "Create user" : "Save"}</SubmitButton>
        </ActionForm>
      </Card>
      {u?.lockedUntil && u.lockedUntil > new Date() && (
        <Card title="Locked">
          <p className="mb-3 text-sm">This account was locked after {u.failedLogins} failed sign-in attempts.</p>
          <ActionForm action={unlockUser.bind(null, u.id)}>
            <SubmitButton variant="secondary">Unlock now</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
