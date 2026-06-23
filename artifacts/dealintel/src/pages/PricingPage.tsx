import { useLocation } from "wouter";
import { Check, Sparkles, Shield, Loader2, Star, Zap, Crown } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUpgradePlan, PLAN_LABELS, type Plan } from "@/hooks/usePlan";
import { useToast } from "@/hooks/use-toast";

const INVESTOR_PLANS = [
  {
    id: "free" as Plan,
    name: "Investor Free",
    price: "₹0",
    period: "forever",
    description: "Start exploring India's M&A marketplace.",
    badge: null,
    icon: null,
    features: [
      "Browse marketplace listings",
      "View public deal summaries",
      "1 private deal analysis",
      "Basic comparable EV valuation",
      "Watchlist (up to 10 deals)",
    ],
    missing: [
      "Bear / Base / Bull scenario analysis",
      "IRR, MOIC & Payback metrics",
      "Unlimited private deal analysis",
      "Deal Pipeline (Kanban board)",
      "Document Vault",
      "Priority deal flow access",
      "AI deal recommendations",
      "Direct seller connect priority",
    ],
    cta: "Current plan",
    ctaVariant: "outline" as const,
    highlight: false,
  },
  {
    id: "investor_pro" as Plan,
    name: "Investor Pro",
    price: "₹2,999",
    period: "per month",
    description: "Full deal intelligence for active acquirers. Best value for serious buyers.",
    badge: "Most Popular",
    icon: Star,
    features: [
      "Everything in Investor Free",
      "Unlimited private deal analysis",
      "Bear / Base / Bull scenario analysis",
      "IRR, MOIC & Payback period metrics",
      "Deal Pipeline (Kanban board)",
      "Verified Deal Rooms",
      "Document Vault (P&L, Balance Sheet, GST)",
      "NDA timestamping & legal confirmation",
      "Priority deal flow access",
    ],
    missing: [
      "AI deal recommendations",
      "Direct seller connect priority",
    ],
    cta: "Upgrade to Pro",
    ctaVariant: "default" as const,
    highlight: true,
  },
  {
    id: "investor_elite" as Plan,
    name: "Investor Elite",
    price: "₹4,999",
    period: "per month",
    description: "For serious acquirers & funds — priority access to every deal.",
    badge: "For Funds & HNIs",
    icon: Crown,
    features: [
      "Everything in Investor Pro",
      "Early access to new deal listings",
      "Advanced analytics & deeper valuation",
      "AI deal recommendations",
      "Direct seller connect priority",
      "Dedicated deal sourcing support",
    ],
    missing: [],
    cta: "Upgrade to Elite",
    ctaVariant: "outline" as const,
    highlight: false,
  },
];

const SELLER_UPGRADES = [
  {
    id: "featured",
    name: "Featured Listing",
    price: "₹999",
    period: "per listing",
    description: "Get noticed. Rise to the top of investor search results.",
    badge: null,
    icon: Zap,
    features: [
      "Priority placement in marketplace",
      "⭐ Featured badge on your listing",
      "+20% deal score boost",
      "Higher investor impressions",
    ],
    cta: "Feature a Listing",
    highlight: false,
  },
  {
    id: "verified_premium",
    name: "Verified + Premium",
    price: "₹2,999",
    period: "per listing",
    description: "Maximum credibility — investors trust verified listings more.",
    badge: "Best Value",
    icon: Shield,
    features: [
      "Everything in Featured",
      "✓ Verified Seller badge",
      "+30% deal score boost",
      "Priority contact request review",
      "Curated investor matching",
      "Faster deal closure pipeline",
    ],
    cta: "Verify & Upgrade",
    highlight: true,
  },
];

const COMPARISON_ROWS = [
  { feature: "Browse listings", free: true, pro: true, elite: true },
  { feature: "Private deal analysis", free: "1 deal", pro: "Unlimited", elite: "Unlimited" },
  { feature: "Scenario analysis (Bear/Base/Bull)", free: false, pro: true, elite: true },
  { feature: "IRR / MOIC / Payback metrics", free: false, pro: true, elite: true },
  { feature: "Deal Pipeline board", free: false, pro: true, elite: true },
  { feature: "Document Vault", free: false, pro: true, elite: true },
  { feature: "Priority deal flow", free: false, pro: true, elite: true },
  { feature: "AI deal recommendations", free: false, pro: false, elite: true },
  { feature: "Direct seller connect priority", free: false, pro: false, elite: true },
];

export default function PricingPage() {
  const { data: user } = useCurrentUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const upgrade = useUpgradePlan();
  const currentTier = (user?.tier ?? "free") as Plan;

  async function handleUpgrade(planId: Plan) {
    if (planId === "free" || planId === currentTier) return;
    try {
      await upgrade.mutateAsync(planId);
      toast({
        title: `Upgraded to ${PLAN_LABELS[planId]}`,
        description: "All premium features are now unlocked on your account.",
      });
    } catch {
      toast({
        title: "Upgrade failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }

  function handleSellerUpgrade() {
    navigate("/seller/listings");
    toast({
      title: "Manage listing upgrades",
      description: "Select a listing to apply Featured or Verified status.",
    });
  }

  return (
    <PortalLayout title="Plans & Pricing" subtitle="Institutional-grade M&A intelligence for the Indian SME market">
      {/* Current plan banner */}
      <Card className="p-4 mb-10 border-primary/30 bg-primary/5 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            Current plan:{" "}
            <span className="text-primary font-bold">
              {PLAN_LABELS[currentTier] ?? currentTier}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {currentTier === "free"
              ? "Upgrade to unlock the full suite of deal intelligence tools."
              : "All premium features are active on your account."}
          </p>
        </div>
        {currentTier === "free" ? (
          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
            Free Plan
          </Badge>
        ) : (
          <Badge className="text-xs bg-primary text-primary-foreground">Active</Badge>
        )}
      </Card>

      {/* ── INVESTOR PLANS ── */}
      {/* Cross-role value strip */}
      <Card className="mb-6 p-5 border-primary/20 bg-primary/5">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">For Investors</p>
            <p className="font-semibold text-sm mb-2">Access exclusive deals from verified business owners</p>
            <ul className="space-y-1">
              {["Off-market opportunities", "Verified seller listings", "Institutional-grade deal data"].map((b) => (
                <li key={b} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-primary shrink-0" />{b}
                </li>
              ))}
            </ul>
          </div>
          <div className="md:border-l md:border-border md:pl-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">For Sellers</p>
            <p className="font-semibold text-sm mb-2">Connect with serious investors actively acquiring businesses</p>
            <ul className="space-y-1">
              {["High-intent buyers", "Faster deal discovery", "Confidential deal room"].map((b) => (
                <li key={b} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-green-400 shrink-0" />{b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="mb-3">
        <h2 className="text-lg font-bold">Investor Plans</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          One good deal pays for your entire subscription.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {INVESTOR_PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isUpgrading = upgrade.isPending && upgrade.variables === plan.id;
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
                  ✓ Your Plan
                </Badge>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  {plan.icon && <plan.icon className="h-4 w-4 text-primary" />}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                </div>
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
                className="w-full gap-2"
                disabled={isCurrent || isUpgrading || plan.id === "free"}
                onClick={() => handleUpgrade(plan.id)}
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activating…
                  </>
                ) : isCurrent ? (
                  "✓ Current Plan"
                ) : (
                  plan.cta
                )}
              </Button>

                      {plan.highlight && (
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Close 1 deal → <span className="text-green-400 font-medium">pays for 12 months</span>
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── COMPARISON TABLE ── */}
      <Card className="mb-10 border-card-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold text-sm">Feature Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Feature</th>
                <th className="text-center px-4 py-3 font-medium">Free</th>
                <th className="text-center px-4 py-3 font-medium text-primary">Pro</th>
                <th className="text-center px-4 py-3 font-medium">Elite</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.feature}</td>
                  {(["free", "pro", "elite"] as const).map((tier) => {
                    const val = row[tier as keyof typeof row];
                    return (
                      <td key={tier} className="px-4 py-2.5 text-center">
                        {val === true ? (
                          <Check className="h-4 w-4 text-green-400 mx-auto" />
                        ) : val === false ? (
                          <div className="h-px w-4 bg-muted-foreground/30 mx-auto" />
                        ) : (
                          <span className="text-xs font-medium text-foreground">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── SELLER UPGRADES ── */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Seller Listing Upgrades</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="text-green-400 font-medium">List for Free.</span>{" "}
            Pay only for visibility & trust when you need it.
          </p>
        </div>
        <Badge className="shrink-0 mt-1 bg-amber-500/15 text-amber-400 border-amber-500/30 border">
          Boost Visibility & Trust
        </Badge>
      </div>

      <Card className="p-4 border-green-500/20 bg-green-500/5 mb-4 flex items-start gap-3">
        <Check className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-400">Free Tier (Default) — always included</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create a listing · Basic marketplace visibility · Standard deal quality score · No credit card required
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {SELLER_UPGRADES.map((plan) => (
          <Card
            key={plan.id}
            className={`p-6 flex flex-col relative ${plan.highlight ? "border-primary/50 shadow-md shadow-primary/10" : "border-card-border"}`}
          >
            {plan.badge && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3">
                {plan.badge}
              </Badge>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <plan.icon className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>
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
            </div>

            <Button
              variant={plan.highlight ? "default" : "outline"}
              className="w-full"
              onClick={handleSellerUpgrade}
            >
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>

      {/* Success fee */}
      <Card className="mt-2 p-5 border-card-border bg-muted/20">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Success Fee Policy
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A <strong className="text-foreground">1–2% success fee</strong> applies on deals closed
          through DealIntel India by Investor Pro subscribers. Calculated on the total enterprise
          value of the closed transaction.
        </p>
      </Card>

      {/* Trust bar */}
      <div className="mt-8 py-5 border-y border-border flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary" />
          Private deal intelligence platform
        </span>
        <span className="hidden sm:block text-border">·</span>
        <span>Used by investors, brokers &amp; founders across India</span>
        <span className="hidden sm:block text-border">·</span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Institutional-grade M&amp;A tools
        </span>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          All amounts in INR. Investor plans auto-renew monthly. Cancel anytime.{" "}
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
