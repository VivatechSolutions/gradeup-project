import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type Theme = "dark" | "light";

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

const STORAGE_KEY = "vite-ui-theme";

// 🔥 Get system preference
function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// 🔥 Apply theme to DOM
function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.setAttribute("data-theme", theme); // for CSS variables
  root.classList.remove("light", "dark"); // for Tailwind / legacy
  root.classList.add(theme);
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      return stored || getSystemTheme() || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  // ✅ Apply on first mount (prevents flicker after hydration)
  useEffect(() => {
    applyTheme(theme);
  }, []);

  // ✅ Set theme globally
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState((prev) => {
      if (prev === newTheme) return prev;

      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {}

      applyTheme(newTheme);
      return newTheme;
    });
  }, []);

  // ✅ Toggle helper
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // ✅ Cross-tab sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY &&
        (e.newValue === "light" || e.newValue === "dark")
      ) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // ✅ OS theme change (only if user hasn’t set manually)
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const newTheme = e.matches ? "dark" : "light";
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// 🔥 Hook
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};