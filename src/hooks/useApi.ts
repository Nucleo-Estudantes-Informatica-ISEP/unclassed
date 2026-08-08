import { useState, useEffect } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Shared DTOs
export type ClassLite = { id: string; name: string; year: number };
export type UserLite = {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  sharePhoneOnMatch?: boolean | null;
};

export type SingleSwapRequest = {
  id: string;
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
  status: string;
  createdAt: string;
  subject?: { code: string; name: string };
  currentClass?: ClassLite;
  preferredClasses?: ClassLite[];
};

export type BundleSwapRequest = {
  id: string;
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
  status: string;
  createdAt: string;
  currentClass?: ClassLite;
  preferredClasses?: ClassLite[];
};

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
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await fetch(url, {
          credentials: "include", // Include cookies for authentication
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Erro: ${response.status}`);
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
            error:
              error instanceof Error ? error.message : "Ocorreu um erro",
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
  return useApi<
    { id: string; code: string; name: string; year: number; semester: number }[]
  >(url);
}

export function useClasses(year?: number) {
  const params = new URLSearchParams();
  if (year) params.append("year", year.toString());

  const url = `/api/classes${params.toString() ? `?${params.toString()}` : ""}`;
  return useApi<ClassLite[]>(url);
}

export function useSingleSwapRequests(userId?: string, status?: string) {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (status) params.append("status", status);
  const url = `/api/swap-requests/single${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  return useApi<SingleSwapRequest[]>(url);
}

export function useBundleSwapRequests(userId?: string, status?: string) {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (status) params.append("status", status);

  const url = `/api/swap-requests/bundle${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  return useApi<BundleSwapRequest[]>(url);
}

export function useMatches<T>(
  status?: string,
  matchType?: string,
  userId?: string
) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (matchType) params.append("matchType", matchType);
  if (userId) params.append("userId", userId);
  const url = `/api/matches${params.toString() ? `?${params.toString()}` : ""}`;
  return useApi<T[]>(url);
}
