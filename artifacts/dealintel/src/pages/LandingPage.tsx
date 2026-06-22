import { SignInButton, SignUpButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  TrendingUp, Shield, BarChart3, Search, Building2, ArrowRight,
  LineChart, Lock, Zap, IndianRupee,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Ticker */}
      <div className="h-7 bg-primary/10 border-b border-primary/20 overflow-hidden flex items-center">
        <div className="ticker-track flex gap-8 whitespace-nowrap text-xs font-mono">
          {Array(2).fill(null).map((_, i) => (
            <span key={i} className="flex gap-8">
              <span className="text-primary">NIFTY 50 <span className="text-green-400">▲ 22,419 +0.42%</span></span>
              <span className="text-primary">SENSEX <span className="text-green-400">▲ 73,667 +0.38%</span></span>
              <span className="text-muted-foreground">M&A Deal Flow India Q2 2026: ₹8.2L Cr</span>
              <span className="text-primary">SME PE Multiple: 8.2x avg</span>
              <span className="text-primary">USDINR <span className="text-red-400">▼ 83.42</span></span>
              <span className="text-muted-foreground">142 Deals Closed YTD</span>
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <img src={`${basePath}/logo.svg`} alt="DealIntel India" className="h-8" />
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="gap-2">Get Started <ArrowRight className="h-4 w-4" /></Button>
            </SignUpButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
          <Zap className="h-3.5 w-3.5" /> India's M&A Intelligence Terminal
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          Where Indian SMEs meet <span className="text-primary">smart capital</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Institutional-grade deal intelligence for the Indian mid-market. Real DCF valuations,
          comparable analysis, and risk scoring — connecting founders with investors.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <SignUpButton mode="modal">
            <Button size="lg" className="gap-2">Launch Terminal <ArrowRight className="h-4 w-4" /></Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline">Sign In</Button>
          </SignInButton>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Avg EV Multiple", value: "8.2x", icon: BarChart3 },
            { label: "Sectors Tracked", value: "12", icon: LineChart },
            { label: "Deal Value Pool", value: "₹8.2L Cr", icon: IndianRupee },
            { label: "DCF Horizon", value: "5 Yr", icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-5 stat-glow">
              <Icon className="h-5 w-5 text-primary mb-2 mx-auto" />
              <p className="text-2xl font-bold font-mono">{value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Dual portal */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 border-card-border">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">For Sellers & Founders</h3>
            <p className="text-sm text-muted-foreground mt-2">
              List your business, get an instant institutional valuation, and connect with
              vetted investors actively seeking deals in your sector.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Free DCF + comparable valuation</li>
              <li className="flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Reach active investors</li>
              <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Control who sees your financials</li>
            </ul>
          </Card>

          <Card className="p-8 border-card-border">
            <div className="h-12 w-12 rounded-xl bg-green-400/10 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold">For Investors & Acquirers</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Discover off-market and listed deals, run advanced valuations, score risk and
              growth, and manage your acquisition pipeline.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-green-400" /> Comparable EV + 5-yr DCF engine</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-green-400" /> Upload & analyze private deals</li>
              <li className="flex items-center gap-2"><LineChart className="h-4 w-4 text-green-400" /> Risk & growth intelligence scoring</li>
            </ul>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-6xl px-6 py-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2026 DealIntel India. Institutional M&A intelligence.</span>
          <span className="font-mono">Built for the Indian mid-market</span>
        </div>
      </footer>
    </div>
  );
}
