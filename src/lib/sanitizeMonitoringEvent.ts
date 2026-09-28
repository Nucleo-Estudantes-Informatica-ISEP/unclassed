import type { ErrorEvent } from "@sentry/nextjs";

const allowedTags = [
  "requestId",
  "jobExecutionId",
  "route",
  "httpMethod",
] as const;

export function sanitizeMonitoringEvent(event: ErrorEvent): ErrorEvent {
  const tags = Object.fromEntries(
    allowedTags.flatMap((key) => {
      const value = event.tags?.[key];
      return typeof value === "string" ? [[key, value]] : [];
    })
  );

  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    release: event.release,
    environment: event.environment,
    tags,
    exception: event.exception?.values
      ? {
          values: event.exception.values.map((value) => ({
            type: value.type,
            value: "[Redacted]",
            stacktrace: value.stacktrace?.frames
              ? {
                  frames: value.stacktrace.frames.map((frame) => ({
                    filename: frame.filename
                      ?.split(/[\\/]/)
                      .pop()
                      ?.split("?")[0],
                    function: frame.function,
                    lineno: frame.lineno,
                    colno: frame.colno,
                  })),
                }
              : undefined,
          })),
        }
      : undefined,
  };
}
