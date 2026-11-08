export type AppRole = "student" | "teacher" | "manager";

export type ProfileRolesPayload = {
  roles?: AppRole[] | string | null;
};

export function parseProfileRoles(payload: ProfileRolesPayload | null | undefined): AppRole[] {
  if (!payload?.roles) return [];
  if (Array.isArray(payload.roles)) return payload.roles;

  try {
    const parsed = JSON.parse(payload.roles);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasAnyRole(roles: AppRole[], allowedRoles: AppRole[]) {
  const allowedRoleSet = new Set(allowedRoles);
  return roles.some((role) => allowedRoleSet.has(role));
}
