export const permissions = [
  "members.manage",
  "audit.read",
  "themes.manage",
  "catalog.manage",
  "spaces.read",
] as const;
export type Permission = (typeof permissions)[number];
export type Role = "member" | "admin" | "superadmin";
export function can(
  role: Role,
  grants: readonly string[],
  permission: Permission,
) {
  return (
    role === "superadmin" || (role === "admin" && grants.includes(permission))
  );
}
export function canDelegate(
  role: Role,
  grants: readonly string[],
  requested: readonly string[],
) {
  return (
    can(role, grants, "members.manage") &&
    requested.every(
      (p) =>
        permissions.includes(p as Permission) &&
        (role === "superadmin" || grants.includes(p)),
    )
  );
}
