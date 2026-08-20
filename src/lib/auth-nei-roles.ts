export const AUTH_NEI_ROLES = ["admin"] as const;

export type AuthNeiRole = (typeof AUTH_NEI_ROLES)[number];

const ROLE_SET = new Set<string>(AUTH_NEI_ROLES);

function rolesFromValue(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((role): role is string => typeof role === "string");
  if (typeof value === "string") return value.split(/[\s,]+/);
  if (value && typeof value === "object") return Object.keys(value);
  return [];
}

export function getAuthNeiRoles(
  claims: Record<string, unknown> | undefined,
  configuredClaim = process.env.AUTH_ROLE_CLAIM
): AuthNeiRole[] {
  if (!claims || !configuredClaim) return [];

  // The shared NEI admin role is authoritative. Never fall back to the
  // generic/current-project claim or aggregate roles from other projects.
  const roles = new Set<AuthNeiRole>();

  for (const role of rolesFromValue(claims[configuredClaim])) {
    if (ROLE_SET.has(role)) roles.add(role as AuthNeiRole);
  }

  return AUTH_NEI_ROLES.filter((role) => roles.has(role));
}

type RolesSource = {
  roles?: readonly AuthNeiRole[];
  authNeiRoles?: readonly AuthNeiRole[];
};

export function hasAuthNeiRole(
  source: RolesSource | null | undefined,
  role: AuthNeiRole
) {
  if (!source) return false;
  const roles = source.roles ?? source.authNeiRoles;
  return roles?.includes(role) ?? false;
}

export function isAdmin(source: RolesSource | null | undefined) {
  return hasAuthNeiRole(source, "admin");
}
