import { useEffect } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: "light";
  storageKey?: string;
};

/** Forces light mode app-wide — dark/system themes are not supported. */
export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    localStorage.removeItem("whatsapp-broadcast-theme");
  }, []);

  return <>{children}</>;
}
