import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { mockUser, mockTeacher } from "../lib/mockData";
import { truncate } from "node:fs";

// Set to true to use mock authentication (no backend required)
const USE_MOCK_AUTH = true;
const POST_AUTH_REDIRECT_KEY = "gradeup_post_auth_redirect";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
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
  const [mockAuthUser, setMockAuthUser] = useState<SelectUser | null>(null);
  const [mockIsLoading, setMockIsLoading] = useState(true);

  // Load mock user from localStorage on mount
  useEffect(() => {
    if (USE_MOCK_AUTH) {
      const savedUser = localStorage.getItem("gradeup_mock_user");
      if (savedUser) {
        try {
          setMockAuthUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("gradeup_mock_user");
        }
      }
      setMockIsLoading(false);
    }
  }, []);

  const {
    data: apiUser,
    error,
    isLoading: apiIsLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !USE_MOCK_AUTH,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (USE_MOCK_AUTH) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const { email, password, role, captchaAnswer, captchaSessionId } = credentials;

        if (!role || !["student", "teacher"].includes(role)) {
          throw new Error("Please select whether you are a student or teacher.");
        }

        if (!email || !password) {
          throw new Error("Email and password cannot be empty.");
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
          throw new Error("Please enter a valid email address.");
        }

        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }

        // Captcha validation
        if (captchaSessionId) {
          if (captchaAnswer !== "GRADEUP") {
            const error = new Error("Incorrect security verification.");
            (error as any).requiresCaptcha = true;
            throw error;
          }
        }

        if (email.includes("teacher") && role === "teacher") {
          return { ...mockTeacher, email, role: "teacher" } as SelectUser;
        }
        if (role === "teacher") {
          return { ...mockTeacher, email, role: "teacher" } as SelectUser;
        }
        return { ...mockUser, email, role: "student" } as SelectUser;
      }

      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      if (USE_MOCK_AUTH) {
        setMockAuthUser(user);
        localStorage.setItem("gradeup_mock_user", JSON.stringify(user));
      } else {
        queryClient.setQueryData(["/api/user"], user);
      }
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
      if (USE_MOCK_AUTH) {
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!credentials.role || !["student", "teacher"].includes(credentials.role)) {
          throw new Error("Invalid role selection. Please select student or teacher.");
        }

        if (!credentials.firstName?.trim()) throw new Error("First name is required.");
        if (!credentials.lastName?.trim())  throw new Error("Last name is required.");
        if (!credentials.username?.trim())  throw new Error("Username is required.");
        if (!credentials.email?.trim())     throw new Error("Email is required.");

        if (!/\S+@\S+\.\S+/.test(credentials.email)) {
          throw new Error("Please enter a valid email address.");
        }

        if (
          credentials.email === "student@example.com" ||
          credentials.email === "teacher@example.com" ||
          credentials.email === "admin@example.com"
        ) {
          throw new Error("Email already registered.");
        }

        if (
          credentials.username === "student" ||
          credentials.username === "teacher" ||
          credentials.username === "admin"
        ) {
          throw new Error("Username already taken.");
        }

        if (!credentials.password) throw new Error("Password is required.");
        if (credentials.password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }

        const newUser: SelectUser = {
          id: Math.floor(Math.random() * 100000).toString(),
          username: credentials.username,
          email: credentials.email,
          firstName: credentials.firstName,
          lastName: credentials.lastName,
          role: credentials.role as "student" | "teacher" | "admin",
          grade: credentials.grade || (credentials.role === "student" ? 10 : null),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          avatar: `https://i.pravatar.cc/40?u=${credentials.username}`,
          bio: "",
          points: 0,
          level: 1,
          lastLogin: new Date().toISOString(),
        };
        return newUser;
      }

      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      if (USE_MOCK_AUTH) {
        setMockAuthUser(user);
        localStorage.setItem("gradeup_mock_user", JSON.stringify(user));
      } else {
        queryClient.setQueryData(["/api/user"], user);
      }
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
      if (USE_MOCK_AUTH) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return;
      }
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      if (USE_MOCK_AUTH) {
        setMockAuthUser(null);
        localStorage.removeItem("gradeup_mock_user");
      } else {
        queryClient.setQueryData(["/api/user"], null);
      }
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

  const user = USE_MOCK_AUTH ? mockAuthUser : (apiUser ?? null);
  const isLoading = USE_MOCK_AUTH ? mockIsLoading : apiIsLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error: USE_MOCK_AUTH ? null : error,
        loginMutation,
        logoutMutation,
        registerMutation,
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
