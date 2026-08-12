import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getMockResponse } from "./mockData";
import { buildApiUrl } from "./apiBase";

// Set to true to use mock data (no backend required)
const USE_MOCK_DATA = false;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrMethod: string,
  data?: unknown | undefined,
): Promise<Response> {
  const method = methodOrUrl.startsWith("/") ? urlOrMethod : methodOrUrl;
  const url = methodOrUrl.startsWith("/") ? methodOrUrl : urlOrMethod;

  if (USE_MOCK_DATA) {
    // Return mock response for mutations
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(buildApiUrl(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
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
    if (USE_MOCK_DATA) {
      // Return mock data based on the endpoint
      const endpoint = queryKey[0] as string;
      const mockData = getMockResponse(endpoint);
      
      if (mockData !== null) {
        return mockData as T;
      }
      
      // For unknown endpoints, return empty array or null
      if (unauthorizedBehavior === "returnNull") {
        return null as T;
      }
      return [] as T;
    }

    const res = await fetch(buildApiUrl(queryKey[0] as string), {
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
