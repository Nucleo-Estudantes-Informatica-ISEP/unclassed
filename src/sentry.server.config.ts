import { sanitizeMonitoringEvent } from "@/lib/sanitizeMonitoringEvent";

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  maxBreadcrumbs: 0,
  tracesSampleRate: 0,
  beforeSend: sanitizeMonitoringEvent,
});
