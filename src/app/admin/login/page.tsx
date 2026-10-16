import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { getCurrentUser } from "@/lib/auth";
import { BRAND } from "@/brand";
import { login } from "./actions";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin/dashboard");
  const input = "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";
  return (
    <main className="admin-ui grid min-h-dvh place-items-center bg-slate-100 px-4 text-slate-900">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">{BRAND.name} CMS</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to manage the website.</p>
        <ActionForm action={login} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" autoComplete="username" required className={input} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" autoComplete="current-password" required className={input} />
          </label>
          <SubmitButton className="w-full justify-center">Sign in</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
