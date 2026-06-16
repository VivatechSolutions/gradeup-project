import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";

const POST_AUTH_REDIRECT_KEY = "gradeup_post_auth_redirect";
const AUTH_TOKEN_KEY = "gradeup_auth_token";
const AUTH_USER_KEY = "gradeup_auth_user";

type SelectUser = {
  id: string;
  _id?: string;
  username?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: "student" | "teacher" | "admin";
  grade?: number | string | null;
  class?: string;
  board?: string;
  school?: string;
  studentId?: string;
  token?: string;
  [key: string]: any;
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
  userHeader: { Authorization?: string };
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
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  grade?: number;
  class?: string;
  board?: string;
  school?: string;
  subjects?: string[];
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [storedUser, setStoredUser] = useState<SelectUser | null>(null);
  const [storedIsLoading, setStoredIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    if (savedUser) {
      try {
        setStoredUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }
    setStoredIsLoading(false);
  }, []);

  const {
    data: apiUser,
    error,
    isLoading: apiIsLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const data = await getQueryFn<any>({ on401: "returnNull" })({
        queryKey: ["/api/v1/auth/me"],
      } as any);
      return data?.data || data || null;
    },
    enabled: !!localStorage.getItem(AUTH_TOKEN_KEY),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (!credentials.role || !["student", "teacher"].includes(credentials.role)) {
        throw new Error("Please select whether you are a student or teacher.");
      }
      const endpoint =
        credentials.role === "teacher"
          ? "/api/v1/auth/teacher/login"
          : "/api/v1/auth/student/login";
      const res = await apiRequest("POST", endpoint, credentials);
      const payload = await res.json();
      return payload.data || payload;
    },
    onSuccess: (user: SelectUser) => {
      if (user.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, user.token);
      }
      setStoredUser(user);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      window.location.href = consumePostAuthRedirect() || "/dashboard";
    },
    onError: (error: Error) => {
      // Only show toast for non-captcha errors
      if (!(error as any).requiresCaptcha) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      if (credentials.role === "teacher") {
        throw new Error("Teacher registration keeps the existing flow.");
      }
      const res = await apiRequest("POST", "/api/v1/auth/student/register", credentials);
      const payload = await res.json();
      return payload.data || payload;
    },
    onSuccess: (user: SelectUser) => {
      if (user.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, user.token);
      }
      setStoredUser(user);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome to GradeUp!",
        description: "Your account has been created successfully.",
      });
      window.location.href = consumePostAuthRedirect() || "/dashboard";
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/v1/auth/logout");
    },
    onSuccess: () => {
      setStoredUser(null);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      // Navigate outside React's update cycle to prevent infinite loop
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const user = apiUser ?? storedUser;
  const isLoading = storedIsLoading || apiIsLoading;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        userHeader: token ? { Authorization: `Bearer ${token}` } : {},
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
