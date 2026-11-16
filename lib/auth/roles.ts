// ============================================================
// Staff roles for the admin panel.
//
//   super_admin      everything: all properties, staff accounts, activity log
//   property_admin   one property: its details, amenities, guest info, rooms,
//                    photos, and all of its outlets and menus
//   requests_team    one property's guest requests only (e.g. housekeeping or
//                    maintenance supervisors): sees and updates Requests
//   outlet_manager   one outlet (e.g. Harbour): its details, hours and the menus
//                    it owns, including marking items sold out
//
// Shared menus (e.g. the wine list Harbour shows) are edited only by the outlet
// that owns them, or by the owning property's admin.
// ============================================================

export const ROLES = ["super_admin", "property_admin", "requests_team", "outlet_manager"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  property_admin: "Property admin",
  requests_team: "Requests team",
  outlet_manager: "Outlet manager",
};

export const ROLE_HELP: Record<Role, string> = {
  super_admin: "Everything, including staff accounts.",
  property_admin: "Everything for one property: details, outlets and menus, facilities, guest requests, info, rooms and photos.",
  requests_team: "One property's guest requests only: sees them, gets assigned, updates their status.",
  outlet_manager: "One restaurant or bar: its details, hours and menus.",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export type Scoped = { role: Role; propertyId: number | null; outletId: number | null };

export function canEditProperty(u: Scoped, propertyId: number) {
  return u.role === "super_admin" || (u.role === "property_admin" && u.propertyId === propertyId);
}

export function canEditOutlet(u: Scoped, outlet: { id: number; propertyId: number }) {
  return canEditProperty(u, outlet.propertyId) || (u.role === "outlet_manager" && u.outletId === outlet.id);
}

/** Who can see and handle a property's guest requests. */
export function canHandleRequests(u: Scoped, propertyId: number) {
  return canEditProperty(u, propertyId) || (u.role === "requests_team" && u.propertyId === propertyId);
}
