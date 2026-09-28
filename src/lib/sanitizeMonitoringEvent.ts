import type { ErrorEvent, Log } from "@sentry/nextjs";

const allowedTags = [
  "requestId",
  "jobExecutionId",
  "route",
  "httpMethod",
] as const;

// Only fixed messages from job and matching paths may leave the stdout logger.
const monitoredMessages = new Set([
  "Running job",
  "Job completed",
  "Job failed",
  "Job skipped: lock held",
  "Cron lock lease lost while job is running",
  "Failed to renew cron lock",
  "Failed to acquire lock",
  "Lock invariant violation",
  "Starting immediate processing for request",
  "Immediate processing failed",
  "Batch processing error:",
  "Batch matching completed",
  "Processing partition ( active requests)",
]);

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const errorName = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const jobIds = new Set([
  "batch-matching",
  "provisional-cleanup",
  "health-check",
]);

export function sanitizeMonitoringLog(log: Log): Log | null {
  if (typeof log.message !== "string" || !monitoredMessages.has(log.message)) {
    return null;
  }

  const source = log.attributes || {};
  const attributes: Record<string, string | number> = {};
  for (const key of ["requestId", "jobExecutionId"] as const) {
    const value = source[key];
    if (typeof value === "string" && uuid.test(value)) attributes[key] = value;
  }
  if (typeof source.jobId === "string" && jobIds.has(source.jobId)) {
    attributes.jobId = source.jobId;
  }
  if (
    typeof source.errorType === "string" &&
    errorName.test(source.errorType)
  ) {
    attributes.errorType = source.errorType;
  }
  for (const key of ["durationMs", "lockCount"] as const) {
    const value = source[key];
    if (
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
    ) {
      attributes[key] = value;
    }
  }

  return { level: log.level, message: log.message, attributes };
}

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
