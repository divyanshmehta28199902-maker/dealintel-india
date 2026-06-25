import { type ReactNode } from "react";
import { useLocation } from "wouter";
import Navbar from "./Navbar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Lock, Shield, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalLayout({
  children,
  title,
  subtitle,
  action,
  backTo,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  /** If provided, renders a ← Back button. Pass a path string or a custom callback. */
  backTo?: string | (() => void);
}) {
  const [, navigate] = useLocation();

  function handleBack() {
    if (typeof backTo === "function") {
      backTo();
    } else if (typeof backTo === "string") {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate(backTo);
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              {backTo !== undefined && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                  onClick={handleBack}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <div>
                {title && (
                  <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {action}
              <ThemeSwitcher />
            </div>
          </div>
          {children}
        </div>
      </main>

      {/* Trust strip */}
      <footer className="border-t border-border py-2.5 px-4 md:px-6">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Private deal intelligence platform
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Confidential &amp; secure
            </span>
            <span className="hidden md:inline text-muted-foreground/60">
              Used by investors, founders &amp; advisors
            </span>
          </div>
          <span className="text-xs font-mono text-muted-foreground/60">DealIntel India</span>
        </div>
      </footer>
    </div>
  );
}
