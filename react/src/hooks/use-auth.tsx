import { createContext, ReactNode, useContext } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";

const POST_AUTH_REDIRECT_KEY = "gradeup_post_auth_redirect";
const AUTH_ACTIVITY_KEY = "gradeup_last_active";

export type SelectUser = {
  id: string;
  _id?: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "student" | "teacher" | "admin";
  grade?: string | number | null;
  board?: string | null;
  school?: string | null;
  schoolStatus?: string | null;
  points?: number;
  level?: number;
  profile?: any;
};

type LoginData = {
  email: string;
  password: string;
  role?: string;
  captchaAnswer?: string;
  captchaSessionId?: string;
};

type RegisterData = {
  email: string;
  username?: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
  grade?: number | string;
  classNumber?: string;
  board?: string;
  schoolName?: string;
  subjects?: string[];
};

type OAuthData = {
  provider: "google" | "microsoft";
  idToken?: string;
  accessToken?: string;
  profileContext?: {
    firstName?: string;
    lastName?: string;
    schoolName?: string;
    board?: string;
    classNumber?: string;
  };
};

type AuthContextType = {
  user: SelectUser | null;
  userHeader: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
  oauthMutation: UseMutationResult<SelectUser, Error, OAuthData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

function consumePostAuthRedirect() {
  const redirect = localStorage.getItem(POST_AUTH_REDIRECT_KEY);
  if (redirect) {
    localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return redirect;
  }
  return null;
}

function unwrapUser(payload: any): SelectUser {
  return (payload?.data || payload) as SelectUser;
}

function resetAuthActivity() {
  localStorage.setItem(AUTH_ACTIVITY_KEY, Date.now().toString());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: apiUser, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/v1/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (credentials.role && credentials.role !== "student") {
        throw new Error("Only student login is available right now.");
      }
      const res = await apiRequest("POST", "/api/v1/auth/login", credentials);
      return unwrapUser(await res.json());
    },
    onSuccess: (user: SelectUser) => {
      resetAuthActivity();
      queryClient.setQueryData(["/api/v1/auth/me"], user);
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
      setLocation(consumePostAuthRedirect() || "/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterData) => {
      if (payload.role !== "student") {
        throw new Error("Only independent student signup is available right now.");
      }
      const res = await apiRequest("POST", "/api/v1/auth/student/register", payload);
      return unwrapUser(await res.json());
    },
    onSuccess: (user: SelectUser) => {
      resetAuthActivity();
      queryClient.setQueryData(["/api/v1/auth/me"], user);
      toast({ title: "Welcome to GradeUp!", description: "Your student account is ready." });
      setLocation(consumePostAuthRedirect() || "/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const oauthMutation = useMutation({
    mutationFn: async (payload: OAuthData) => {
      const res = await apiRequest(
        "POST",
        `/api/v1/auth/student/oauth/${payload.provider}`,
        payload,
      );
      return unwrapUser(await res.json());
    },
    onSuccess: (user: SelectUser) => {
      resetAuthActivity();
      queryClient.setQueryData(["/api/v1/auth/me"], user);
      toast({ title: "Welcome to GradeUp!", description: "You are signed in." });
      setLocation(consumePostAuthRedirect() || "/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "OAuth failed", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/v1/auth/logout");
    },
    onSuccess: () => {
      localStorage.removeItem(AUTH_ACTIVITY_KEY);
      queryClient.setQueryData(["/api/v1/auth/me"], null);
      queryClient.clear();
      toast({ title: "Logged out", description: "You have been successfully logged out." });
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
    },
  });

  const user = apiUser ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        userHeader: user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        oauthMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
