import { useState } from "react";
import { useLocation } from "wouter";
import { Building2, Search, Handshake, ArrowRight, Zap, TrendingUp, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser, useUpdateUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type RoleChoice = "seller" | "investor" | "broker";

const ROLES: { id: RoleChoice; label: string; sub: string; icon: typeof Building2; iconColor: string; iconBg: string; bullets: string[] }[] = [
  {
    id: "seller",
    label: "Business Owner / Seller",
    sub: "I want to list my business and find serious buyers.",
    icon: Building2,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    bullets: ["List for free in minutes", "Institutional-grade valuation", "Connect with qualified investors"],
  },
  {
    id: "investor",
    label: "Investor / Buyer",
    sub: "I want to discover, analyse, and acquire businesses.",
    icon: TrendingUp,
    iconColor: "text-green-400",
    iconBg: "bg-green-400/10",
    bullets: ["Analyse any deal in 10 seconds", "IRR, MOIC & scenario analysis", "Private deal room with docs"],
  },
  {
    id: "broker",
    label: "Broker / Advisor",
    sub: "I represent buyers or sellers and manage transactions.",
    icon: Handshake,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/10",
    bullets: ["Access full deal intelligence", "Manage multiple mandates", "Pipeline & document vault"],
  },
];

export default function OnboardingPage() {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [role, setRole] = useState<RoleChoice | null>(null);
  const [name, setName] = useState(user?.name ?? "");

  if (user?.role) {
    navigate(user.role === "seller" ? "/seller/dashboard" : "/investor/marketplace");
    return null;
  }

  async function handleSubmit() {
    if (!role) {
      toast({ title: "Select a role", description: "Choose how you'll use DealIntel.", variant: "destructive" });
      return;
    }
    try {
      // Broker maps to the investor portal — same deal intelligence tools
      const dbRole = role === "broker" ? "investor" : role;
      await updateUser.mutateAsync({ role: dbRole, name: name.trim() || undefined });
      navigate(dbRole === "seller" ? "/seller/dashboard" : "/investor/marketplace");
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo + headline */}
        <div className="text-center mb-8">
          <img src={`${basePath}/logo.svg`} alt="DealIntel India" className="h-9 mx-auto mb-6" />
          <h1 className="text-3xl font-bold">Welcome to DealIntel India</h1>
          <p className="text-muted-foreground mt-2">
            How do you want to use the platform?
          </p>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-sm">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="mt-1.5"
              data-testid="input-name"
            />
          </div>

          {/* Role cards */}
          <div className="grid gap-3">
            {ROLES.map((r) => (
              <Card
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`p-5 cursor-pointer transition-all hover-elevate flex items-start gap-4 ${role === r.id ? "border-primary ring-1 ring-primary bg-primary/5" : "border-card-border"}`}
                data-testid={`card-role-${r.id}`}
              >
                <div className={`h-10 w-10 rounded-xl ${r.iconBg} flex items-center justify-center shrink-0`}>
                  <r.icon className={`h-5 w-5 ${r.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{r.label}</h3>
                    {role === r.id && (
                      <span className="text-xs text-primary font-medium">✓ Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {r.bullets.map((b) => (
                      <li key={b} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="h-2.5 w-2.5 text-primary shrink-0" />{b}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>

          <Button
            className="w-full gap-2 mt-2"
            size="lg"
            onClick={handleSubmit}
            disabled={updateUser.isPending || !role}
            data-testid="button-continue"
          >
            {updateUser.isPending ? "Setting up…" : "Get Started"} <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Trust bar */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Private & secure</span>
            <span>·</span>
            <span>Used by investors, founders &amp; advisors</span>
            <span>·</span>
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Free to get started</span>
          </div>
        </div>
      </div>
    </div>
  );
}
