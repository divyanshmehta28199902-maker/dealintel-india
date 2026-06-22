import { useClerk } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Building2, Search, BookmarkPlus, Shield, MessageSquare,
  LogOut, ChevronDown, Bell, BarChart3, Sparkles,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Navbar() {
  const { signOut } = useClerk();
  const { data: user } = useCurrentUser();
  const [location, navigate] = useLocation();

  const isSeller = user?.role === "seller";
  const isInvestor = user?.role === "investor";

  const sellerLinks = [
    { href: "/seller/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/seller/list", label: "List Business", icon: Building2 },
    { href: "/seller/listings", label: "My Listings", icon: TrendingUp },
    { href: "/seller/requests", label: "Inquiries", icon: Bell },
  ];

  const investorLinks = [
    { href: "/investor/marketplace", label: "Marketplace", icon: Search },
    { href: "/investor/watchlist", label: "Watchlist", icon: BookmarkPlus },
    { href: "/investor/private-deals", label: "Private Deals", icon: Shield },
    { href: "/investor/pipeline", label: "Pipeline", icon: BarChart3 },
  ];

  const links = isSeller ? sellerLinks : isInvestor ? investorLinks : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-sidebar/95 backdrop-blur-sm">
      {/* Ticker tape */}
      <div className="h-6 bg-primary/10 border-b border-primary/20 overflow-hidden flex items-center">
        <div className="ticker-track flex gap-8 whitespace-nowrap text-xs font-mono">
          {Array(2).fill(null).map((_, i) => (
            <span key={i} className="flex gap-8">
              <span className="text-primary">NIFTY 50 <span className="text-green-400">▲ 22,419 +0.42%</span></span>
              <span className="text-primary">SENSEX <span className="text-green-400">▲ 73,667 +0.38%</span></span>
              <span className="text-primary">BSE SME IPO <span className="text-green-400">▲ 2.1%</span></span>
              <span className="text-muted-foreground">M&A Deal Flow India Q2 2026: ₹8.2L Cr</span>
              <span className="text-primary">USDINR <span className="text-red-400">▼ 83.42</span></span>
              <span className="text-primary">10Y G-SEC <span className="text-muted-foreground">6.87%</span></span>
              <span className="text-muted-foreground">SME PE Multiple: 8.2x avg</span>
              <span className="text-primary">Deals Closed YTD <span className="text-green-400">142</span></span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src={`${basePath}/logo.svg`} alt="DealIntel India" className="h-7 w-auto" />
        </Link>

        {/* Nav links */}
        {links.length > 0 && (
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-2 h-8 text-xs font-medium ${location === href ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* Messages */}
        {user?.role && (
          <Link href="/messages" className="hidden md:flex">
            <Button variant="ghost" size="sm" className={`gap-2 h-8 text-xs font-medium ${location.startsWith("/messages") ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <MessageSquare className="h-3.5 w-3.5" />
              Messages
            </Button>
          </Link>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Role badge */}
          {user?.role && (
            <Badge variant="outline" className="hidden sm:flex text-xs border-primary/30 text-primary font-mono">
              {user.role === "seller" ? "SELLER" : "INVESTOR"}
            </Badge>
          )}

          {/* Tier badge */}
          {user?.tier && user.tier !== "free" && (
            <Badge className="hidden sm:flex text-xs bg-primary text-primary-foreground">
              {user.tier === "pro" ? "PRO" : "INVESTOR PRO"}
            </Badge>
          )}

          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8 text-xs text-muted-foreground hover:text-foreground">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {(user.name ?? user.email)?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-24 truncate">{user.name ?? user.email}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium">{user.name ?? "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                {/* Switch portal */}
                {isSeller && (
                  <DropdownMenuItem onClick={() => navigate("/seller/dashboard")}>
                    <Building2 className="h-3.5 w-3.5 mr-2" /> Seller Portal
                  </DropdownMenuItem>
                )}
                {isInvestor && (
                  <DropdownMenuItem onClick={() => navigate("/investor/marketplace")}>
                    <Search className="h-3.5 w-3.5 mr-2" /> Investor Portal
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/pricing")}>
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" /> Plans &amp; Pricing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ redirectUrl: basePath || "/" })}
                  className="text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
