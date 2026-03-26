const REQUIRED_AUTH_ENV_VARS = [
  "AUTH_ISSUER_URL",
  "AUTH_CLIENT_ID",
  "AUTH_CLIENT_SECRET",
  "AUTH_SECRET",
] as const;

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getMissingAuthEnvVars() {
  return REQUIRED_AUTH_ENV_VARS.filter((key) => !hasValue(process.env[key]));
}

export function isAuthConfigured() {
  return getMissingAuthEnvVars().length === 0;
}
