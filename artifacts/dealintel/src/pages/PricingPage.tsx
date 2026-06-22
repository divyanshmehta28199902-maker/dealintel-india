import { useLocation } from "wouter";
import { Check, Sparkles, Building2, Shield, GitBranch, FileText, MessageSquare, Eye } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Get started exploring deals on DealIntel India.",
    badge: null,
    features: [
      "Browse marketplace listings",
      "View public deal summaries",
      "1 private deal analysis",
      "Basic valuation (comparable EV only)",
      "Watchlist (up to 10)",
    ],
    missing: [
      "Scenario analysis (Bear / Base / Bull)",
      "IRR / MOIC / Payback metrics",
      "Deal Pipeline tracking",
      "Document Vault",
      "Verified Deal Rooms",
      "NDA timestamping",
    ],
    cta: "Current plan",
    ctaVariant: "outline" as const,
    highlight: false,
  },
  {
    id: "investor_pro",
    name: "Investor Pro",
    price: "₹4,999",
    period: "per month",
    description: "Full deal intelligence for active acquirers.",
    badge: "Most Popular",
    features: [
      "Everything in Free",
      "Unlimited private deal analysis",
      "Bear / Base / Bull scenario analysis",
      "IRR, MOIC & Payback metrics",
      "Deal Pipeline (Kanban board)",
      "Verified Deal Rooms",
      "Document Vault (P&L, Balance Sheet, GST)",
      "NDA timestamping & legal confirmation",
      "Priority deal flow access",
      "1–2% success fee on closed deals",
    ],
    missing: [],
    cta: "Upgrade to Pro",
    ctaVariant: "default" as const,
    highlight: true,
  },
  {
    id: "seller_premium",
    name: "Seller Premium",
    price: "₹2,999",
    period: "per listing/month",
    description: "Maximum exposure and credibility for sellers.",
    badge: null,
    features: [
      "Everything in Free Seller",
      "Featured placement in marketplace",
      "Verified Seller badge",
      "Deal quality score boost",
      "Priority contact request review",
      "Dedicated deal origination support",
      "Curated investor matching",
    ],
    missing: [],
    cta: "Upgrade Listing",
    ctaVariant: "outline" as const,
    highlight: false,
  },
];

const FEATURE_ICONS: Record<string, typeof Check> = {
  pipeline: GitBranch,
  document: FileText,
  message: MessageSquare,
  eye: Eye,
  shield: Shield,
  building: Building2,
};

export default function PricingPage() {
  const { data: user } = useCurrentUser();
  const [, navigate] = useLocation();
  const currentTier = user?.tier ?? "free";

  return (
    <PortalLayout title="Plans & Pricing" subtitle="Institutional-grade M&A intelligence for the Indian SME market">
      {/* Current plan banner */}
      {currentTier !== "free" && (
        <Card className="p-4 mb-8 border-primary/30 bg-primary/5 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">You're on the <span className="text-primary font-bold">{PLANS.find(p => p.id === currentTier)?.name ?? currentTier}</span> plan</p>
            <p className="text-xs text-muted-foreground">All premium features are active on your account.</p>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id;
          return (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col relative ${plan.highlight ? "border-primary shadow-lg shadow-primary/10" : "border-card-border"}`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3">
                  {plan.badge}
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="outline" className="absolute -top-3 right-4 text-xs border-green-500/30 text-green-400 bg-background">
                  Current Plan
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold font-mono">{plan.price}</span>
                  <span className="text-sm text-muted-foreground ml-2">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <div className="flex-1 space-y-2 mb-6">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
                {plan.missing.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 opacity-40">
                    <div className="h-4 w-4 shrink-0 mt-0.5 flex items-center justify-center">
                      <div className="h-px w-3 bg-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <Button
                variant={plan.ctaVariant}
                className="w-full"
                disabled={isCurrent}
                onClick={() => {
                  if (!isCurrent) {
                    // In production: navigate to payment/upgrade flow
                    // For now: show contact info
                    window.open("mailto:hello@dealintelindia.com?subject=Upgrade+to+" + plan.name, "_blank");
                  }
                }}
              >
                {isCurrent ? "Current Plan" : plan.cta}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Success fee notice */}
      <Card className="mt-8 p-5 border-card-border bg-muted/20">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Success Fee Policy
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A <strong className="text-foreground">1–2% success fee</strong> applies on deals that are completed through the DealIntel India platform by Investor Pro subscribers. The fee is calculated on the total enterprise value of the closed transaction. We trust our members to self-report honestly — deal integrity is foundational to this market.
        </p>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          All amounts in INR. Plans auto-renew monthly. Cancel anytime.
          {" "}
          <button
            onClick={() => navigate(user?.role === "seller" ? "/seller/dashboard" : "/investor/marketplace")}
            className="text-primary hover:underline"
          >
            Back to dashboard
          </button>
        </p>
      </div>
    </PortalLayout>
  );
}
