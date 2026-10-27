"use client";

import { useState } from "react";
import type { Role } from "@/generated/prisma/enums";
import { PERMISSIONS, PERMISSION_KEYS, ROLE_LABELS, ROLE_PRESETS, type Permission } from "@/lib/permissions";

// Picking a role ticks that role's default modules; the boxes can then be changed per user.
export function RolePermissions({ role: initialRole, permissions, className }: { role: Role; permissions: string[]; className: string }) {
  const [role, setRole] = useState(initialRole);
  const [granted, setGranted] = useState(() => new Set(permissions));
  const all = role === "SUPER_ADMIN";
  const toggle = (p: Permission) =>
    setGranted((s) => {
      const next = new Set(s);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  return (
    <>
      <label className="block font-medium">
        Role
        <select
          name="role"
          value={role}
          onChange={(e) => {
            const r = e.target.value as Role;
            setRole(r);
            setGranted(new Set(ROLE_PRESETS[r]));
          }}
          className={className}
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="rounded-md border border-slate-200 p-3">
        <legend className="px-1 font-medium">Module permissions</legend>
        {all && <p className="mb-2 text-xs text-slate-500">Super admins have every module.</p>}
        <div className="space-y-1.5">
          {PERMISSION_KEYS.map((p) => (
            <label key={p} className="flex items-start gap-2">
              <input
                type="checkbox"
                name="permissions"
                value={p}
                checked={all || granted.has(p)}
                disabled={all}
                onChange={() => toggle(p)}
                className="mt-0.5"
              />
              <span>{PERMISSIONS[p]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
