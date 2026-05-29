import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  changeAdminPassword,
  fetchCurrentAdmin,
  loginAdmin,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("gradeup_admin_token") || "",
  );
  const [admin, setAdmin] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const response = await fetchCurrentAdmin();
        if (active) {
          setAdmin(response.data);
        }
      } catch (error) {
        localStorage.removeItem("gradeup_admin_token");
        if (active) {
          setToken("");
          setAdmin(null);
        }
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      admin,
      isBootstrapping,
      async login(credentials) {
        const response = await loginAdmin(credentials);
        localStorage.setItem("gradeup_admin_token", response.data.token);
        setToken(response.data.token);
        setAdmin(response.data.admin);
        return response;
      },
      async updatePassword(payload) {
        const response = await changeAdminPassword(payload);
        setAdmin(response.data.admin);
        return response;
      },
      setAdmin,
      logout() {
        localStorage.removeItem("gradeup_admin_token");
        setToken("");
        setAdmin(null);
      },
    }),
    [admin, isBootstrapping, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
