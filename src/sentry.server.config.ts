import { logger } from "@/lib/logger";
import {
  sanitizeMonitoringEvent,
  sanitizeMonitoringLog,
} from "@/lib/sanitizeMonitoringEvent";

import * as Sentry from "@sentry/nextjs";

Sentry.pinoIntegration.trackLogger(logger);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  maxBreadcrumbs: 0,
  tracesSampleRate: 0,
  integrations: [
    Sentry.pinoIntegration({
      autoInstrument: false,
      log: { levels: ["info", "warn", "error", "fatal"] },
    }),
  ],
  beforeSend: sanitizeMonitoringEvent,
  beforeSendLog: sanitizeMonitoringLog,
});
