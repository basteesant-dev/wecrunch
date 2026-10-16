"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { ok?: boolean; error?: string; message?: string } | null;
type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function ActionForm({ action, children, className = "" }: { action: Action; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="mt-4 whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.message || "Saved."}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary", className = "", confirm }: { children: ReactNode; variant?: "primary" | "secondary" | "danger"; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    danger: "bg-red-700 text-white hover:bg-red-600",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`inline-flex min-h-9 items-center rounded-md px-4 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
