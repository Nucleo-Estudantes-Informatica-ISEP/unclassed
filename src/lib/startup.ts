/**
 * Application Startup Initialization
 *
 * This file contains all startup logic that needs to run when the application starts.
 * It's designed to be called once during app initialization.
 */

import { initializeCronScheduler } from "@/services/cronScheduler";
import { env } from "@/lib/env";

let isInitialized = false;

/**
 * Initialize all application startup tasks
 */
export function initializeApplication(): void {
  if (isInitialized) {
    return; // Prevent multiple initializations
  }

  console.log('🚀 Initializing application...');

  try {
    // Initialize cron scheduler for self-hosted deployments
    initializeCronScheduler();

    isInitialized = true;
    console.log('✅ Application initialization completed');

  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    // Don't exit in production, just log the error
    if (env.NODE_ENV !== 'production') {
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
