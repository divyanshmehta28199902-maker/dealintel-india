import { useState } from "react";
import { Monitor, Sun, Bell, ShieldCheck } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { applyTheme } from "@/components/ThemeSwitcher";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const currentTheme = document.documentElement.classList.contains("bloomberg")
    ? "bloomberg"
    : "light";
  const [theme, setTheme] = useState<"bloomberg" | "light">(currentTheme);
  const { toast } = useToast();

  function handleTheme(t: "bloomberg" | "light") {
    setTheme(t);
    applyTheme(t);
    toast({ title: "Theme updated" });
  }

  return (
    <PortalLayout title="Settings" subtitle="Manage your preferences">
      <div className="max-w-2xl space-y-4">

        {/* Appearance */}
        <Card className="p-6 border-border">
          <h3 className="text-sm font-semibold mb-1">Appearance</h3>
          <p className="text-xs text-muted-foreground mb-4">Choose your preferred theme.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTheme("bloomberg")}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-colors ${
                theme === "bloomberg"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-[#060D18] border border-[#00D1FF]/30 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-[#00D1FF]" />
              </div>
              <div>
                <p className="text-xs font-semibold">Bloomberg</p>
                <p className="text-xs text-muted-foreground">Dark terminal</p>
              </div>
            </button>
            <button
              onClick={() => handleTheme("light")}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="h-10 w-10 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center">
                <Sun className="h-5 w-5 text-[#2563EB]" />
              </div>
              <div>
                <p className="text-xs font-semibold">Off-White</p>
                <p className="text-xs text-muted-foreground">Light mode</p>
              </div>
            </button>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 border-border">
          <h3 className="text-sm font-semibold mb-1">Notifications</h3>
          <p className="text-xs text-muted-foreground mb-4">Control when DealIntel contacts you.</p>
          <div className="space-y-3">
            {[
              { icon: Bell, label: "New investor inquiry", sub: "When an investor requests contact on your listing" },
              { icon: Bell, label: "Message received", sub: "When you receive a new message in a deal thread" },
              { icon: ShieldCheck, label: "Deal status change", sub: "Pipeline stage updates and milestones" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">Email</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Danger */}
        <Card className="p-6 border-border">
          <h3 className="text-sm font-semibold mb-1">Account</h3>
          <p className="text-xs text-muted-foreground mb-4">Permanent account actions.</p>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => toast({ title: "Contact support", description: "Email support@dealintel.in to request account deletion.", variant: "destructive" })}
          >
            Request account deletion
          </Button>
        </Card>

      </div>
    </PortalLayout>
  );
}
