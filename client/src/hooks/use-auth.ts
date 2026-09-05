import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { User } from "@shared/models/auth";

export const SESSION_SUPERSEDED_KEY = "auth:sessionSuperseded";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    if (body?.code === "SESSION_SUPERSEDED") {
      sessionStorage.setItem(SESSION_SUPERSEDED_KEY, "1");
    }
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  // Soft logout — destroy server session via fetch, then clear client cache.
  // Avoid window.location.href (full document reload) which felt like a hang.
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  }).catch(() => {
    // Even if the network call fails, clear local auth so the UI unblocks.
  });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Detect when another device signs in and invalidates this session.
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      setLocation("/");
    },
    onError: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      setLocation("/");
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
