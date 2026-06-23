import { useEffect, useState } from "react";
import { Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "bloomberg" | "light";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("bloomberg", "light");
  root.classList.add(theme);
  localStorage.setItem("dealintel-theme", theme);
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("bloomberg");

  useEffect(() => {
    const saved = (localStorage.getItem("dealintel-theme") as Theme) || "bloomberg";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const next: Theme = theme === "bloomberg" ? "light" : "bloomberg";

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9"
      data-testid="theme-switcher"
      title={theme === "bloomberg" ? "Switch to Off-White" : "Switch to Bloomberg"}
      onClick={() => {
        setTheme(next);
        applyTheme(next);
      }}
    >
      {theme === "bloomberg" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Monitor className="h-4 w-4" />
      )}
    </Button>
  );
}
