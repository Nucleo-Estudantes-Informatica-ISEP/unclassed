"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSystemStatus } from "@/context/SystemStatusContext";
import {
  RESTRICTED_ROUTES_WHEN_UNAVAILABLE as RESTRICTED_ROUTES,
  ADMIN_ONLY_ROUTES_WHEN_UNAVAILABLE as ADMIN_ONLY_ROUTES,
  ALLOWED_ROUTES_WHEN_UNAVAILABLE as ALLOWED_ROUTES,
} from "@/config/routes";

interface RouteProtectionProps {
  children: React.ReactNode;
  userRole?: string;
  isLoggedIn?: boolean;
}

export default function RouteProtection({ children, userRole, isLoggedIn = false }: RouteProtectionProps) {
  const { isUnavailable, isLoading, refreshStatus } = useSystemStatus();
  const router = useRouter();
  const pathname = usePathname();

  // Route rules loaded from centralized config
  const restrictedRoutes = RESTRICTED_ROUTES;
  const adminOnlyRoutes = ADMIN_ONLY_ROUTES;
  const allowedWhenUnavailable = ALLOWED_ROUTES;

  const isAdmin = () => userRole === 'ADMIN';
  const isAllowed = () => allowedWhenUnavailable.some(route => pathname.startsWith(route));
  const isRestricted = () => restrictedRoutes.some(route => pathname.startsWith(route));
  const isAdminOnly = () => adminOnlyRoutes.some(route => pathname.startsWith(route));
  const isHomepage = () => pathname === '/';

  const shouldBlock = () => {
    if (!isUnavailable) return false;
    if (isAdmin()) return false;
    if (isAllowed()) return false;
    if (isRestricted()) return true;
    if (isAdminOnly()) return true;
    if (isHomepage()) return true;
    return false;
  };

  useEffect(() => {
    refreshStatus();
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;
    if (shouldBlock()) {
      router.push('/unavailable');
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