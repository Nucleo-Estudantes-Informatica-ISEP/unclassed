/**
 * Application Startup Initialization
 *
 * This file contains all startup logic that needs to run when the application starts.
 * It's designed to be called once during app initialization.
 */

import { initializeCronScheduler } from './cronInit';

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
    if (process.env.NODE_ENV !== 'production') {
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

// Auto-initialize on import in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON_SCHEDULER === 'true') {
  // Use setTimeout to ensure this runs after all modules are loaded
  setTimeout(() => {
    if (!isInitialized) {
      console.log('🔄 Auto-initializing application...');
      initializeApplication();
    }
  }, 1000);
}
