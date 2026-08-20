import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional()
);
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalSecret = z.preprocess(
  emptyToUndefined,
  z.string().min(32, "Secret must contain at least 32 characters").optional()
);
const optionalBoolean = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === "") return undefined;
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }, z.boolean().default(defaultValue));

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PHASE: optionalString,
    npm_lifecycle_event: optionalString,
    npm_package_version: optionalString,
    DATABASE_URL: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^mongodb(?:\+srv)?:\/\//, "DATABASE_URL must be a MongoDB URL")
        .optional()
    ),
    APP_BASE_URL: optionalUrl,
    NEXT_PUBLIC_APP_URL: optionalUrl,
    AUTH_ISSUER_URL: optionalUrl,
    AUTH_CLIENT_ID: optionalString,
    AUTH_CLIENT_SECRET: optionalString,
    AUTH_SCOPES: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(1).default("openid email profile offline_access")
    ),
    AUTH_ROLE_CLAIM: optionalString,
    AUTH_SECRET: optionalSecret,
    AUTH_POST_LOGOUT_REDIRECT_URI: optionalUrl,
    AUTH_TRUST_HOST: optionalBoolean(false),
    AUTH_DEBUG: optionalBoolean(false),
    CRON_SECRET: optionalSecret,
    ENABLE_CRON_SCHEDULER: optionalBoolean(false),
    CRON_BATCH_MATCHING: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(1).default("*/5 * * * *")
    ),
    CRON_PROVISIONAL_CLEANUP: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(1).default("*/30 * * * *")
    ),
    CRON_HEALTH_CHECK: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(1).default("0 * * * *")
    ),
    EMAIL_FROM: z.preprocess(
      emptyToUndefined,
      z.email().default("no-reply@nei-isep.org")
    ),
    EMAIL_HOST: optionalString,
    EMAIL_PORT: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(65_535).default(587)
    ),
    EMAIL_SECURE: optionalBoolean(false),
    EMAIL_USER: optionalString,
    EMAIL_PASS: optionalString,
  })
  .superRefine((value, context) => {
    const isProductionBuild =
      value.NEXT_PHASE === "phase-production-build" ||
      value.npm_lifecycle_event === "build";

    if (value.NODE_ENV === "production" && !isProductionBuild) {
      const required = [
        "DATABASE_URL",
        "APP_BASE_URL",
        "AUTH_ISSUER_URL",
        "AUTH_CLIENT_ID",
        "AUTH_CLIENT_SECRET",
        "AUTH_SECRET",
        "AUTH_POST_LOGOUT_REDIRECT_URI",
        "CRON_SECRET",
      ] as const;

      for (const name of required) {
        if (!value[name]) {
          context.addIssue({
            code: "custom",
            path: [name],
            message: `${name} is required in production`,
          });
        }
      }
    }

    const smtpValues = [value.EMAIL_HOST, value.EMAIL_USER, value.EMAIL_PASS];
    if (smtpValues.some(Boolean) && !smtpValues.every(Boolean)) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_HOST"],
        message: "EMAIL_HOST, EMAIL_USER, and EMAIL_PASS must be set together",
      });
    }
  });

export function parseEnvironment(source: Record<string, string | undefined>) {
  return environmentSchema.parse(source);
}

export const env = parseEnvironment(process.env);
