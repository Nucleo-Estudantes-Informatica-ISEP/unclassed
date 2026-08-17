export const AUTH_NEI_ROLES = ["admin"] as const;

export type AuthNeiRole = (typeof AUTH_NEI_ROLES)[number];

const ROLE_SET = new Set<string>(AUTH_NEI_ROLES);
const DEFAULT_ROLE_CLAIM = "urn:zitadel:iam:org:project:roles";

function rolesFromValue(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((role): role is string => typeof role === "string");
  if (typeof value === "string") return value.split(/[\s,]+/);
  if (value && typeof value === "object") return Object.keys(value);
  return [];
}

export function getAuthNeiRoles(
  claims: Record<string, unknown> | undefined,
  configuredClaim = process.env.AUTH_ROLE_CLAIM ?? DEFAULT_ROLE_CLAIM
): AuthNeiRole[] {
  if (!claims) return [];

  // Unclassed has its own ZITADEL Project. Never aggregate role claims from
  // other NEI applications, even when their project-ID claims are present.
  const keys = new Set([configuredClaim, DEFAULT_ROLE_CLAIM]);
  const roles = new Set<AuthNeiRole>();

  for (const key of keys) {
    for (const role of rolesFromValue(claims[key])) {
      if (ROLE_SET.has(role)) roles.add(role as AuthNeiRole);
    }
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
