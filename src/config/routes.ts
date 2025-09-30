// Centralized route configuration for availability and access control

export const RESTRICTED_ROUTES_WHEN_UNAVAILABLE: string[] = [
  "/dashboard",
  "/swap-requests",
  "/matches",
  "/register",
];

export const ADMIN_ONLY_ROUTES_WHEN_UNAVAILABLE: string[] = [
  "/profile",
];

export const ALLOWED_ROUTES_WHEN_UNAVAILABLE: string[] = [
  "/unavailable",
  "/login",
];
