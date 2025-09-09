import { useState, useEffect } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(url: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await fetch(url, {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!isCancelled) {
          setState({ data, loading: false, error: null });
        }
      } catch (error) {
        if (!isCancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : "An error occurred",
          });
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  return state;
}

// Custom hooks for specific API endpoints
export function useSubjects(year?: number, semester?: number) {
  const params = new URLSearchParams();
  if (year) params.append("year", year.toString());
  if (semester) params.append("semester", semester.toString());
  
  const url = `/api/subjects${params.toString() ? `?${params.toString()}` : ""}`;
  return useApi<any[]>(url);
}

export function useClasses(year?: number) {
  const params = new URLSearchParams();
  if (year) params.append("year", year.toString());
  
  const url = `/api/classes${params.toString() ? `?${params.toString()}` : ""}`;
  return useApi<any[]>(url);
}

export function useSingleSwapRequests(userId?: string, status?: string) {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (status) params.append("status", status);
  
  const url = `/api/swap-requests/single${params.toString() ? `?${params.toString()}` : ""}`;
  return useApi<any[]>(url);
}

export function useBundleSwapRequests(userId?: string, status?: string) {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (status) params.append("status", status);
  
  const url = `/api/swap-requests/bundle${params.toString() ? `?${params.toString()}` : ""}`;
  return useApi<any[]>(url);
}

export function useMatches(status?: string, matchType?: string, userId?: string) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (matchType) params.append("matchType", matchType);
  if (userId) params.append("userId", userId);
  
  const url = `/api/matches${params.toString() ? `?${params.toString()}` : ""}`;
  return useApi<any[]>(url);
}
