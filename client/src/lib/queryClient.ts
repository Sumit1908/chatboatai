import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      else if (body?.error && typeof body.error === "string") message = body.error;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }
    const err = new Error(`${res.status}: ${message}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
}

// CSRF token (see server/csrf.ts) - fetched once and cached for the life of
// the tab. Only enforced server-side on /api/admin/* and change-password
// today, but attaching it to every non-GET request here is harmless for
// everything else and means this file doesn't need per-route knowledge of
// which endpoints check it. Cleared on logout by useAuth (a fresh session
// after logging back in needs a fresh token).
let cachedCsrfToken: string | null = null;

export function clearCsrfToken() {
  cachedCsrfToken = null;
}

async function getCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch("/api/csrf-token", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    cachedCsrfToken = data.csrfToken ?? null;
    return cachedCsrfToken;
  } catch {
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (method.toUpperCase() !== "GET") {
    const token = await getCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
