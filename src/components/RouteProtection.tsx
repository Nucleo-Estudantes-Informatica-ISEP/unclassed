"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSystemStatus } from "@/context/SystemStatusContext";

interface RouteProtectionProps {
  children: React.ReactNode;
  userRole?: string;
  isLoggedIn?: boolean;
}

export default function RouteProtection({ children, userRole, isLoggedIn = false }: RouteProtectionProps) {
  const { isUnavailable, isLoading, refreshStatus } = useSystemStatus();
  const router = useRouter();
  const pathname = usePathname();

  // Define restricted routes when system is unavailable
  const restrictedRoutes = ['/dashboard', '/swap-requests', '/matches', '/register'];
  const adminOnlyRoutes = ['/profile'];
  const allowedWhenUnavailable = ['/unavailable', '/login'];

  useEffect(() => {
    // Always recheck status immediately on route/path changes
    refreshStatus();
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;

    if (isUnavailable) {
      // Admins can access everything even when system is unavailable
      if (userRole === 'ADMIN') {
        return;
      }

      // Allow access to unavailable page and login page only
      if (allowedWhenUnavailable.some(route => pathname.startsWith(route))) {
        return;
      }

      // Check if current route is restricted (includes register, dashboard, etc.)
      const isRestrictedRoute = restrictedRoutes.some(route => pathname.startsWith(route));
      
      if (isRestrictedRoute) {
        router.push('/unavailable');
        return;
      }

      // Check if trying to access profile without admin role
      const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route));
      if (isAdminOnlyRoute && userRole !== 'ADMIN') {
        router.push('/unavailable');
        return;
      }

      // For non-admin users (logged in or not), redirect from homepage to unavailable
      if (pathname === '/' && userRole !== 'ADMIN') {
        router.push('/unavailable');
        return;
      }
    }
  }, [isUnavailable, isLoading, pathname, router, userRole, isLoggedIn]);

  // Show loading while checking status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}