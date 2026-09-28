import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import pino from "pino";

import { env } from "@/lib/env";

type LogContext = { requestId?: string; jobExecutionId?: string };

const context = new AsyncLocalStorage<LogContext>();

export const logger = pino({
  level: env.LOG_LEVEL || (env.NODE_ENV === "production" ? "info" : "debug"),
  ...(env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
  mixin: () => ({ ...context.getStore() }),
  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "email",
      "*.password",
      "*.token",
      "*.authorization",
      "*.email",
    ],
    censor: "[Redacted]",
  },
});

export function withLogContext<T>(values: LogContext, run: () => T): T {
  return context.run({ ...context.getStore(), ...values }, run);
}

export function getLogContext(): LogContext {
  return context.getStore() || {};
}

export function withJobExecution<T>(run: () => T): T {
  return withLogContext(
    { jobExecutionId: getLogContext().jobExecutionId || randomUUID() },
    run
  );
}

export function safeError(error: unknown): { errorType: string } {
  return { errorType: error instanceof Error ? error.name : "UnknownError" };
}
