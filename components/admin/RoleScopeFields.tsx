"use client";

import { useState } from "react";
import { ROLES, ROLE_HELP, ROLE_LABELS, type Role } from "@/lib/auth/roles";

type Opt = { id: number; name: string };

/** Role picker that shows the property or outlet field the role needs. */
export function RoleScopeFields({
  properties,
  outlets,
  role: initialRole = "outlet_manager",
  propertyId,
  outletId,
  disabled,
}: {
  properties: Opt[];
  outlets: (Opt & { property: string })[];
  role?: Role;
  propertyId?: number | null;
  outletId?: number | null;
  disabled?: boolean;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  return (
    <div className="flex flex-wrap gap-2">
      <select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="input w-44" disabled={disabled} title={ROLE_HELP[role]}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {(role === "property_admin" || role === "requests_team") && (
        <select name="propertyId" defaultValue={propertyId ?? ""} className="input w-52" disabled={disabled} required>
          <option value="">Choose property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {role === "outlet_manager" && (
        <select name="outletId" defaultValue={outletId ?? ""} className="input w-60" disabled={disabled} required>
          <option value="">Choose outlet…</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.property})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
