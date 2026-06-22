import { type ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const PLAN_LABELS: Record<string, string> = {
  investor_pro: "Investor Pro",
  seller_premium: "Seller Premium",
  free: "Free",
};

interface PlanGateProps {
  requiredPlan: "investor_pro" | "seller_premium";
  children: ReactNode;
  /** Show a full-page upgrade wall instead of an inline blur overlay */
  fullPage?: boolean;
  featureName?: string;
}

/**
 * Wraps content that requires a paid plan.
 * - If the user has the required plan (or better): renders children.
 * - Otherwise: renders a blurred overlay with an upgrade CTA.
 */
export default function PlanGate({ requiredPlan, children, fullPage = false, featureName }: PlanGateProps) {
  const { data: user, isLoading } = useCurrentUser();
  const [, navigate] = useLocation();

  if (isLoading) return <>{children}</>;

  const userPlan = user?.tier ?? "free";
  const hasAccess = userPlan === requiredPlan || userPlan === "investor_pro";

  if (hasAccess) return <>{children}</>;

  const label = PLAN_LABELS[requiredPlan] ?? requiredPlan;

  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">{featureName ?? "Premium Feature"}</h2>
          <p className="text-muted-foreground max-w-md">
            This feature is available on the <strong className="text-foreground">{label}</strong> plan.
            Upgrade to unlock {featureName?.toLowerCase() ?? "this feature"} and the full suite of deal intelligence tools.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/pricing")} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Upgrade to {label}
          </Button>
          <Button variant="outline" onClick={() => navigate(-1 as never)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-40 saturate-0">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-sm rounded-lg border border-primary/20">
        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div className="text-center px-6">
          <p className="font-semibold text-sm mb-1">
            🔒 {label} Required
          </p>
          <p className="text-xs text-muted-foreground">
            {featureName ? `${featureName} is` : "This feature is"} available on the {label} plan.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/pricing")} className="gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade Now
        </Button>
      </div>
    </div>
  );
}
