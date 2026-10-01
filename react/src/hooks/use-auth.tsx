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
  recaptchaToken?: string;
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
type RegistrationResult = { email: string; verificationPending: true; pendingToken?: string };

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
  registerMutation: UseMutationResult<RegistrationResult, Error, RegisterData>;
  oauthMutation: UseMutationResult<SelectUser | RegistrationResult, Error, OAuthData>;
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

function clearClientAuthState() {
  localStorage.removeItem(AUTH_ACTIVITY_KEY);
  localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  queryClient.setQueryData(["/api/v1/auth/me"], null);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "/api/v1/auth/me",
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: apiUser, error, isLoading } = useQuery<any, Error>({
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
      if (!error.message.includes("EMAIL_VERIFICATION_PENDING")) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterData) => {
      if (payload.role !== "student") {
        throw new Error("Only independent student signup is available right now.");
      }
      const res = await apiRequest("POST", "/api/v1/auth/student/register", payload);
      return (await res.json()).data as RegistrationResult;
    },
    onSuccess: () => {
      toast({ title: "Check your email", description: "Use the verification link before signing in." });
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
      return (await res.json()).data as SelectUser | RegistrationResult;
    },
    onSuccess: (user: SelectUser | RegistrationResult) => {
      if ("verificationPending" in user) {
        toast({ title: "Check your email", description: "Verify this address before signing in." });
        return;
      }
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
    onError: (error: Error) => { toast({ title: "Logout failed", description: error.message + ". Please try again.", variant: "destructive" }); },
    mutationFn: async () => {
      await apiRequest("POST", "/api/v1/auth/logout");
    },
    onSuccess: async () => {
      await queryClient.cancelQueries();
      clearClientAuthState();
      toast({ title: "Logged out", description: "You have been successfully logged out." });
      // Reload so no in-flight authenticated view can repopulate the previous user.
      window.location.replace("/auth");

    },
  });

  const candidate = apiUser ? unwrapUser(apiUser) : null;
  const user = candidate && (candidate.id || candidate._id) ? candidate : null;

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
