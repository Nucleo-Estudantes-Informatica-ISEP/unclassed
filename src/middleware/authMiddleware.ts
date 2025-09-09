import { NextRequest, NextResponse } from "next/server";
import getServerSession from "@/services/getServerSession";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: "USER" | "ADMIN";
  };
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  allowCronSecret?: boolean;
  rateLimitKey?: string;
}

/**
 * Authentication middleware for API endpoints
 */
export async function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const {
      requireAuth = true,
      requireAdmin = false,
      allowCronSecret = false,
      rateLimitKey
    } = options;

    try {
      // Rate limiting check
      if (rateLimitKey) {
        const rateLimitResult = await checkRateLimit(request, rateLimitKey);
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter },
            { status: 429 }
          );
        }
      }

      // Check for cron secret authentication
      if (allowCronSecret) {
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = request.headers.get('authorization');
        
        if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
          // Cron authentication successful, proceed without user auth
          return await handler(request as AuthenticatedRequest);
        }
      }

      // Skip authentication if not required
      if (!requireAuth) {
        return await handler(request as AuthenticatedRequest);
      }

      // Get user session
      const session = await getServerSession();
      
      if (!session) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Check admin requirement
      if (requireAdmin && session.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      // Add user to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role as "USER" | "ADMIN"
      };

      return await handler(authenticatedRequest);

    } catch (error) {
      console.error("Authentication middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Simple in-memory rate limiting
 * For production, consider using Redis or a proper rate limiting service
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(request: NextRequest, key: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const identifier = getClientIdentifier(request);
  const rateLimitKey = `${key}:${identifier}`;
  const now = Date.now();
  const windowSize = 60000; // 1 minute
  const maxRequests = getMaxRequestsForKey(key);

  const current = rateLimitStore.get(rateLimitKey);

  if (!current || now > current.resetTime) {
    // Reset or first request
    rateLimitStore.set(rateLimitKey, {
      count: 1,
      resetTime: now + windowSize
    });
    return { allowed: true };
  }

  if (current.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  current.count++;
  rateLimitStore.set(rateLimitKey, current);
  
  return { allowed: true };
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || cfConnectingIP || 'unknown';
}

function getMaxRequestsForKey(key: string): number {
  const limits: Record<string, number> = {
    'matching': 10,      // 10 requests per minute for matching
    'batch': 2,          // 2 requests per minute for batch processing
    'stats': 30,         // 30 requests per minute for statistics
    'create': 5,         // 5 requests per minute for creating swap requests
    'default': 60        // Default rate limit
  };
  
  return limits[key] || limits.default;
}

/**
 * Cleanup old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Cleanup every 5 minutes

/**
 * Helper function to validate request origin
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow requests from the same domain
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ].filter(Boolean);

  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return true;
  }

  if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed))) {
    return true;
  }

  // Allow requests without origin (direct API calls, curl, etc.)
  return !origin && !referer;
}

/**
 * CSRF protection middleware
 */
export async function withCSRF(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: AuthenticatedRequest): Promise<NextResponse> => {
    // Skip CSRF for GET requests and cron jobs
    if (request.method === 'GET' || request.headers.get('user-agent')?.includes('cron')) {
      return await handler(request);
    }

    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 }
      );
    }

    return await handler(request);
  };
}
