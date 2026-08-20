/**
 * Cron Scheduler Initialization
 * 
 * This module initializes the internal cron scheduler for self-hosted deployments.
 * It's called during app startup to schedule all background jobs.
 */

import { getCronScheduler } from '../services/cronScheduler';
import { env } from './env';

/**
 * Initialize all scheduled jobs for the application
 */
export function initializeCronScheduler(): void {
  const enableScheduler = env.ENABLE_CRON_SCHEDULER;
  
  if (!enableScheduler) {
    console.log('⏰ Cron scheduler is disabled (ENABLE_CRON_SCHEDULER=false)');
    return;
  }

  console.log('⏰ Initializing advanced cron scheduler...');
  
  try {
    const cronScheduler = getCronScheduler();
    
    // Start the scheduler
    cronScheduler.start();
    
    const jobStatus = cronScheduler.getJobStatus();
    console.log(`✅ Cron scheduler initialized with ${jobStatus.length} jobs:`);
    
    // Log all registered jobs
    jobStatus.forEach(job => {
      const nextRun = job.nextRun ? job.nextRun.toLocaleString() : 'pending';
      console.log(`   - ${job.name}: ${job.schedule} (${job.enabled ? 'enabled' : 'disabled'}) - next: ${nextRun}`);
    });
    
    // Setup graceful shutdown
    const shutdown = () => {
      console.log('⏰ Shutting down cron scheduler...');
      cronScheduler.stop();
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('❌ Failed to initialize cron scheduler:', error);
  }
}

/**
 * Health check function to verify cron scheduler status
 */
export function getCronSchedulerStatus() {
  const enableScheduler = env.ENABLE_CRON_SCHEDULER;
  
  try {
    const cronScheduler = getCronScheduler();
    const jobStatus = cronScheduler.getJobStatus();
    
    return {
      enabled: enableScheduler,
      running: cronScheduler.isRunning(),
      jobs: jobStatus.map(job => ({
        id: job.id,
        name: job.name,
        schedule: job.schedule,
        enabled: job.enabled,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        isRunning: job.isRunning
      }))
    };
  } catch (error) {
    return {
      enabled: enableScheduler,
      running: false,
      jobs: [],
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
