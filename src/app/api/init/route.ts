/**
 * Application Initialization Endpoint
 * 
 * This endpoint is called during application startup to initialize
 * all background services like the cron scheduler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApplication, isAppInitialized } from '@/lib/startup';
import { getCronSchedulerStatus } from '@/lib/cronInit';

/**
 * Initialize application services
 * This endpoint should be called once during application startup
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize the application
    initializeApplication();
    
    // Get status information
    const cronStatus = getCronSchedulerStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Aplicação inicializada com sucesso',
      initialized: isAppInitialized(),
      services: {
        cronScheduler: cronStatus
      }
    });
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Falha ao inicializar a aplicação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * Get application initialization status
 */
export async function GET(request: NextRequest) {
  try {
    const cronStatus = getCronSchedulerStatus();
    
    return NextResponse.json({
      initialized: isAppInitialized(),
      services: {
        cronScheduler: cronStatus
      }
    });
    
  } catch (error) {
    console.error('Failed to get application status:', error);
    
    return NextResponse.json({
      initialized: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
