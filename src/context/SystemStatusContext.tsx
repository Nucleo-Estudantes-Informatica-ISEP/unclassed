"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SystemStatusContextType {
  isUnavailable: boolean;
  isLoading: boolean;
  refreshStatus: () => Promise<void>;
}

const SystemStatusContext = createContext<SystemStatusContextType | undefined>(undefined);

export function SystemStatusProvider({ children }: { children: ReactNode }) {
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStatus = async () => {
    try {
      const response = await fetch('/api/system-status', { cache: 'no-store' });
      const data = await response.json();
      
      if (data.success) {
        setIsUnavailable(data.unavailable === true);
      }
    } catch (error) {
      console.error('Error checking system status:', error);
      // If there's an error, assume system is available
      setIsUnavailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshStatus();

    // Refresh on window focus and tab visibility change for immediate updates
    const handleFocus = () => {
      refreshStatus();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshStatus();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // Refresh status frequently to minimize delay while user stays on a page
    const interval = setInterval(refreshStatus, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <SystemStatusContext.Provider value={{ isUnavailable, isLoading, refreshStatus }}>
      {children}
    </SystemStatusContext.Provider>
  );
}

export function useSystemStatus() {
  const context = useContext(SystemStatusContext);
  if (context === undefined) {
    throw new Error('useSystemStatus must be used within a SystemStatusProvider');
  }
  return context;
}