import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2, TrendingUp, Eye, Bell, MessageSquare, Plus, FileText,
  CheckCircle2, Users, Zap,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { SellerDashboardStats, Listing } from "@/lib/types";

export default function SellerDashboard() {
  const { data: stats } = useQuery<SellerDashboardStats>({
    queryKey: ["dashboard", "seller"],
    queryFn: () => api.get("/dashboard/seller"),
  });

  const { data: listings } = useQuery<Listing[]>({
    queryKey: ["listings", "my"],
    queryFn: () => api.get("/listings/my"),
  });

  const recent = (listings ?? []).slice(0, 5);

  return (
    <PortalLayout
      title="Seller Dashboard"
      subtitle="Manage your business listings and investor inquiries"
      action={
        <Link href="/seller/list">
          <Button className="gap-1.5 px-4 py-2 h-8 text-sm" data-testid="button-new-listing">
            <Plus className="h-3.5 w-3.5" /> List Business
          </Button>
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Listings"
          value={stats?.totalListings ?? 0}
          icon={Building2}
          sub={`${stats?.activeListings ?? 0} active · ${stats?.draftListings ?? 0} draft`}
        />
        <StatCard label="Total Views" value={stats?.totalViews ?? 0} icon={Eye} accent="blue" />
        <StatCard
          label="Pending Inquiries"
          value={stats?.pendingContactRequests ?? 0}
          icon={Bell}
          accent="green"
          sub={`${stats?.acceptedContactRequests ?? 0} accepted`}
        />
        <StatCard label="Conversations" value={stats?.totalMessages ?? 0} icon={MessageSquare} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent listings */}
        <Card className="lg:col-span-2 border-border">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Recent Listings</h2>
            <Link href="/seller/listings">
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2">View all</Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recent.length === 0 && (
              <div className="p-10 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1">List your first business for free</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                  Get an instant DCF valuation and connect with investors actively seeking acquisitions.
                </p>
                <Link href="/seller/list">
                  <Button size="sm" className="gap-1.5 px-4 py-2">
                    <Plus className="h-3.5 w-3.5" /> Create Listing
                  </Button>
                </Link>
              </div>
            )}
            {recent.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3 deal-row">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{l.companyName}</p>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {l.industry} · {l.city ?? "—"} · {l.viewCount} views
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm num text-foreground">{formatINR(l.askingValuation)}</p>
                  <p className="text-xs text-muted-foreground">asking</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="p-4 border-border h-fit">
          <h2 className="text-sm font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: "/seller/list", icon: Plus, label: "List a Business" },
              { href: "/seller/listings", icon: FileText, label: "Manage Listings" },
              { href: "/seller/requests", icon: Bell, label: "Review Inquiries" },
              { href: "/messages", icon: MessageSquare, label: "Messages" },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="block">
                <Button variant="outline" className="w-full justify-start gap-2 h-8 text-sm px-3">
                  <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <p className="text-xs font-semibold">Pro tip</p>
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Listings with complete financials — EBITDA margin and growth rate — get more accurate
              valuations and 3× more investor inquiries.
            </p>
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:              { label: "Active",   cls: "bg-green-500/15 text-green-400 border-green-500/30" },
    draft:               { label: "Draft",    cls: "bg-muted text-muted-foreground border-border" },
    pending_approval:    { label: "Pending",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    under_negotiation:   { label: "In Talks", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    closed:              { label: "Closed",   cls: "bg-muted text-muted-foreground border-border" },
  };
  const s = map[status] ?? map.draft;
  return <Badge variant="outline" className={`text-xs h-4 px-1.5 ${s.cls}`}>{s.label}</Badge>;
}
