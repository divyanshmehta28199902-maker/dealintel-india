import { useEffect, useState } from "react";
import { SignInButton, SignUpButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  TrendingUp, Shield, BarChart3, Search, Building2, ArrowRight,
  LineChart, Lock, Zap, IndianRupee, Check,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function isBloomberg() {
  return document.documentElement.classList.contains("bloomberg");
}

export default function LandingPage() {
  const [logoSrc, setLogoSrc] = useState(
    () => `${basePath}/${isBloomberg() ? "logo.svg" : "logo-light.svg"}`,
  );

  useEffect(() => {
    const update = () =>
      setLogoSrc(`${basePath}/${isBloomberg() ? "logo.svg" : "logo-light.svg"}`);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F14] text-gray-900 dark:text-[#E5E7EB]">

      {/* Ticker */}
      <div className="h-7 bg-blue-50 dark:bg-[#111827] border-b border-blue-100 dark:border-[#1F2937] overflow-hidden flex items-center">
        <div className="ticker-track flex gap-8 whitespace-nowrap text-xs font-mono">
          {Array(2).fill(null).map((_, i) => (
            <span key={i} className="flex gap-8">
              <span className="text-blue-700 dark:text-[#00D1FF]">
                NIFTY 50 <span className="text-green-600 dark:text-green-400">▲ 22,419 +0.42%</span>
              </span>
              <span className="text-blue-700 dark:text-[#00D1FF]">
                SENSEX <span className="text-green-600 dark:text-green-400">▲ 73,667 +0.38%</span>
              </span>
              <span className="text-gray-500 dark:text-[#9CA3AF]">M&A Deal Flow India Q2 2026: ₹8.2L Cr</span>
              <span className="text-blue-700 dark:text-[#00D1FF]">SME PE Multiple: 8.2x avg</span>
              <span className="text-blue-700 dark:text-[#00D1FF]">
                USDINR <span className="text-red-500 dark:text-red-400">▼ 83.42</span>
              </span>
              <span className="text-gray-500 dark:text-[#9CA3AF]">142 Deals Closed YTD</span>
            </span>
          ))}
        </div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B0F14]/90 backdrop-blur border-b border-gray-200 dark:border-[#1F2937]">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src={logoSrc}
              alt="DealIntel India"
              className="h-7 w-auto"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div
              className="h-7 w-7 bg-[#00D1FF] rounded-md items-center justify-center text-[#0B0F14] font-semibold text-sm"
              style={{ display: "none" }}
            >
              D
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 dark:text-[#9CA3AF] hover:text-gray-900 dark:hover:text-[#E5E7EB] hover:bg-gray-100 dark:hover:bg-[#111827] px-4 py-2 h-8 text-sm"
              >
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-[#00D1FF] dark:hover:bg-[#22DAFF] dark:text-[#0B0F14] text-white font-medium px-4 py-2 h-8 text-sm gap-1.5"
              >
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </SignUpButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-12 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-[#00D1FF]/25 bg-blue-50 dark:bg-[#00D1FF]/8 px-3 py-1 text-xs font-medium text-blue-700 dark:text-[#00D1FF] mb-6">
          <Zap className="h-3 w-3" /> India's M&A Intelligence Terminal
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl mx-auto leading-tight text-gray-900 dark:text-[#E5E7EB]">
          Where Indian SMEs meet{" "}
          <span className="text-blue-600 dark:text-[#00D1FF]">smart capital</span>
        </h1>
        <p className="mt-4 text-sm text-gray-500 dark:text-[#9CA3AF] max-w-xl mx-auto leading-normal">
          Institutional-grade deal intelligence for the Indian mid-market. Real DCF valuations,
          comparable analysis, and risk scoring — connecting founders with investors.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <SignUpButton mode="modal">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-[#00D1FF] dark:hover:bg-[#22DAFF] dark:text-[#0B0F14] text-white font-medium px-5 py-2.5 gap-1.5"
            >
              Launch Terminal <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-300 dark:border-[#1F2937] text-gray-700 dark:text-[#E5E7EB] hover:bg-gray-50 dark:hover:bg-[#111827] px-5 py-2.5"
            >
              Sign In
            </Button>
          </SignInButton>
        </div>

        {/* Stat cards */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Avg EV Multiple", value: "8.2x", icon: BarChart3 },
            { label: "Sectors Tracked", value: "12", icon: LineChart },
            { label: "Deal Value Pool", value: "₹8.2L Cr", icon: IndianRupee },
            { label: "DCF Horizon", value: "5 Yr", icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] rounded-lg p-4 shadow-sm dark:shadow-none metric-ring text-center"
            >
              <Icon className="h-4 w-4 text-blue-600 dark:text-[#00D1FF] mb-2 mx-auto" />
              <p className="text-xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-[#E5E7EB]">{value}</p>
              <p className="text-xs text-gray-400 dark:text-[#9CA3AF] uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-y border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] py-3">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap justify-center gap-x-8 gap-y-1.5">
          {[
            "Verified seller listings",
            "Off-market deal access",
            "Institutional DCF engine",
            "Confidential deal room",
            "5-yr scenario analysis",
          ].map((item) => (
            <span key={item} className="text-xs text-gray-500 dark:text-[#9CA3AF] flex items-center gap-1.5">
              <Check className="h-3 w-3 text-blue-600 dark:text-[#00D1FF] shrink-0" /> {item}
            </span>
          ))}
        </div>
      </div>

      {/* Dual portal cards */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-[#9CA3AF] mb-6 text-left">
          Built for both sides of the deal
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Seller */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] rounded-lg p-6 shadow-sm dark:shadow-none hover-elevate">
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-[#00D1FF]/8 border border-blue-100 dark:border-[#00D1FF]/20 flex items-center justify-center mb-4">
              <Building2 className="h-4.5 w-4.5 text-blue-600 dark:text-[#00D1FF]" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[#E5E7EB] mb-1">For Sellers & Founders</h3>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF] leading-normal mb-4">
              List your business, get an instant institutional valuation, and connect with
              vetted investors seeking deals in your sector.
            </p>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-[#E5E7EB]">
              {[
                { icon: TrendingUp, text: "Free DCF + comparable valuation" },
                { icon: Search, text: "Reach active investors" },
                { icon: Lock, text: "Control who sees your financials" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-blue-600 dark:text-[#00D1FF] shrink-0" /> {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Investor */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] rounded-lg p-6 shadow-sm dark:shadow-none hover-elevate">
            <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-400/8 border border-green-100 dark:border-green-400/20 flex items-center justify-center mb-4">
              <Search className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[#E5E7EB] mb-1">For Investors & Acquirers</h3>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF] leading-normal mb-4">
              Discover off-market and listed deals, run advanced valuations, score risk and
              growth, and manage your acquisition pipeline.
            </p>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-[#E5E7EB]">
              {[
                { icon: BarChart3, text: "Comparable EV + 5-yr DCF engine" },
                { icon: Shield, text: "Upload & analyze private deals" },
                { icon: LineChart, text: "Risk & growth intelligence scoring" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-green-500 dark:text-green-400 shrink-0" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gray-900 dark:bg-[#070B10] border-t border-gray-800 dark:border-[#1F2937] py-12">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">
            Get your valuation in <span className="text-[#00D1FF]">10 seconds</span>
          </h2>
          <p className="text-gray-400 text-sm mb-6 leading-normal">
            No spreadsheets. No bankers. Institutional-grade analysis, instantly.
          </p>
          <SignUpButton mode="modal">
            <Button
              className="bg-[#00D1FF] hover:bg-[#22DAFF] text-[#0B0F14] font-medium px-5 py-2.5 gap-1.5"
            >
              Start for Free <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </SignUpButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0B0F14] border-t border-gray-200 dark:border-[#1F2937]">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 dark:text-[#9CA3AF]">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="" className="h-5 w-auto opacity-60" />
            <span>© 2026 DealIntel India. Institutional M&A intelligence.</span>
          </div>
          <span className="font-mono">Built for the Indian mid-market</span>
        </div>
      </footer>
    </div>
  );
}
