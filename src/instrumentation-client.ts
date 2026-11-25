import { sanitizeMonitoringEvent } from "@/lib/sanitizeMonitoringEvent";

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    maxBreadcrumbs: 0,
    tracesSampleRate: 0,
    beforeSend: sanitizeMonitoringEvent,
  });
}
