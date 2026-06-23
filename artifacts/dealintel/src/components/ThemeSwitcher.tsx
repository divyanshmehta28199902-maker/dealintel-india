import { useEffect, useState } from "react";
import { Moon, Sun, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Theme = "dark" | "light" | "finance-blue";

const THEMES: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "finance-blue", label: "Finance Blue", icon: BarChart3 },
];

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light", "finance-blue");
  root.classList.add(theme);
  localStorage.setItem("dealintel-theme", theme);
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = (localStorage.getItem("dealintel-theme") as Theme) || "light";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9" data-testid="theme-switcher">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map(({ value, label, icon: ThemeIcon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => {
              setTheme(value);
              applyTheme(value);
            }}
            className={theme === value ? "bg-accent" : ""}
          >
            <ThemeIcon className="h-4 w-4 mr-2" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
