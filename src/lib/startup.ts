import { env } from "@/lib/env";
import { logger, safeError } from "@/lib/logger";
/**
 * Application Startup Initialization
 *
 * This file contains all startup logic that needs to run when the application starts.
 * It's designed to be called once during app initialization.
 */

import { initializeCronScheduler } from "@/services/cronScheduler";

let isInitialized = false;

/**
 * Initialize all application startup tasks
 */
export function initializeApplication(): void {
  if (isInitialized) {
    return; // Prevent multiple initializations
  }

  logger.info("Initializing application...");

  try {
    // Initialize cron scheduler for self-hosted deployments
    initializeCronScheduler();

    isInitialized = true;
    logger.info("Application initialization completed");
  } catch (error) {
    logger.error(safeError(error), "Application initialization failed:");
    // Don't exit in production, just log the error
    if (env.NODE_ENV !== "production") {
      process.exit(1);
    }
  }
}

/**
 * Check if the application has been initialized
 */
export function isAppInitialized(): boolean {
  return isInitialized;
}
