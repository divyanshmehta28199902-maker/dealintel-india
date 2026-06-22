import { type ReactNode } from "react";
import Navbar from "./Navbar";
import { ThemeSwitcher } from "./ThemeSwitcher";

export default function PortalLayout({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
        {(title || action) && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {action}
              <ThemeSwitcher />
            </div>
          </div>
        )}
        {!title && (
          <div className="flex justify-end mb-4">
            <ThemeSwitcher />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
