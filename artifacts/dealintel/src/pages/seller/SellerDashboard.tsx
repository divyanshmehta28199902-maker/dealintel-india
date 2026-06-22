import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2, TrendingUp, Eye, Bell, MessageSquare, Plus, FileText, CheckCircle2,
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
          <Button className="gap-2" data-testid="button-new-listing"><Plus className="h-4 w-4" /> List Business</Button>
        </Link>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Listings" value={stats?.totalListings ?? 0} icon={Building2} sub={`${stats?.activeListings ?? 0} active · ${stats?.draftListings ?? 0} draft`} />
        <StatCard label="Total Views" value={stats?.totalViews ?? 0} icon={Eye} accent="blue" />
        <StatCard label="Pending Inquiries" value={stats?.pendingContactRequests ?? 0} icon={Bell} accent="green" sub={`${stats?.acceptedContactRequests ?? 0} accepted`} />
        <StatCard label="Conversations" value={stats?.totalMessages ?? 0} icon={MessageSquare} accent="blue" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-card-border">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold">Recent Listings</h2>
            <Link href="/seller/listings"><Button variant="ghost" size="sm">View all</Button></Link>
          </div>
          <div className="divide-y divide-border">
            {recent.length === 0 && (
              <div className="p-10 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No listings yet</p>
                <Link href="/seller/list">
                  <Button variant="outline" size="sm" className="mt-3 gap-2"><Plus className="h-4 w-4" /> Create your first listing</Button>
                </Link>
              </div>
            )}
            {recent.map((l) => (
              <div key={l.id} className="flex items-center justify-between p-4 deal-row">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{l.companyName}</p>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.industry} · {l.city ?? "—"} · {l.viewCount} views</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-mono font-semibold text-sm">{formatINR(l.askingValuation)}</p>
                  <p className="text-xs text-muted-foreground">asking</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-card-border h-fit">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/seller/list" className="block">
              <Button variant="outline" className="w-full justify-start gap-2"><Plus className="h-4 w-4" /> List a Business</Button>
            </Link>
            <Link href="/seller/listings" className="block">
              <Button variant="outline" className="w-full justify-start gap-2"><FileText className="h-4 w-4" /> Manage Listings</Button>
            </Link>
            <Link href="/seller/requests" className="block">
              <Button variant="outline" className="w-full justify-start gap-2"><Bell className="h-4 w-4" /> Review Inquiries</Button>
            </Link>
            <Link href="/messages" className="block">
              <Button variant="outline" className="w-full justify-start gap-2"><MessageSquare className="h-4 w-4" /> Messages</Button>
            </Link>
          </div>

          <div className="mt-6 rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-medium">Pro tip</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Listings with complete financials (EBITDA margin, growth rate) get more accurate
              valuations and 3x more investor inquiries.
            </p>
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
    pending_approval: { label: "Pending", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    under_negotiation: { label: "In Talks", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    closed: { label: "Closed", cls: "bg-muted text-muted-foreground border-border" },
  };
  const s = map[status] ?? map.draft;
  return <Badge variant="outline" className={`text-xs ${s.cls}`}>{s.label}</Badge>;
}
