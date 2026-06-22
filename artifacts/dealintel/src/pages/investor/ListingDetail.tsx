import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft, MapPin, Users, Calendar, Bookmark, BookmarkPlus, Send,
  Building2, Eye, TrendingUp,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ValuationDisplay } from "@/components/ValuationDisplay";
import { IntelligenceDisplay } from "@/components/IntelligenceDisplay";
import { api } from "@/lib/api";
import { formatINR, formatPct } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { Listing, ValuationResult, IntelligenceResult, WatchlistItem } from "@/lib/types";

export default function ListingDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: ["listing", id],
    queryFn: () => api.get(`/listings/${id}`),
  });

  const { data: valuation } = useQuery<ValuationResult>({
    queryKey: ["listing", id, "valuation"],
    queryFn: () => api.get(`/listings/${id}/valuation`),
    enabled: !!listing,
  });

  const { data: intel } = useQuery<IntelligenceResult>({
    queryKey: ["listing", id, "intelligence"],
    queryFn: () => api.get(`/listings/${id}/intelligence`),
    enabled: !!listing,
  });

  const { data: watchlist } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: () => api.get("/watchlist"),
  });
  const watched = new Set((watchlist ?? []).map((w) => w.listingId)).has(id);

  const toggleWatch = useMutation({
    mutationFn: async () => watched ? api.delete(`/watchlist/${id}`) : api.post(`/watchlist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  const requestContact = useMutation({
    mutationFn: () => api.post(`/listings/${id}/contact`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "investor"] });
      setDialogOpen(false);
      setMessage("");
      toast({ title: "Contact request sent", description: "The seller will be notified of your interest." });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  if (isLoading) return <PortalLayout title="Loading…"><div /></PortalLayout>;
  if (!listing) return <PortalLayout title="Not found"><p className="text-sm text-muted-foreground">This listing doesn't exist.</p></PortalLayout>;

  return (
    <PortalLayout>
      <Button variant="ghost" size="sm" className="gap-2 mb-4 -ml-2" onClick={() => navigate("/investor/marketplace")}>
        <ArrowLeft className="h-4 w-4" /> Back to Marketplace
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{listing.companyName}</h1>
            <Badge variant="outline">{listing.industry}</Badge>
            <Badge variant="outline" className="capitalize">{listing.stage}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {listing.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {listing.city}{listing.state ? `, ${listing.state}` : ""}</span>}
            {listing.employeeCount && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {listing.employeeCount} employees</span>}
            {listing.foundedYear && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Est. {listing.foundedYear}</span>}
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {listing.viewCount} views</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => toggleWatch.mutate()} data-testid="button-watch">
            {watched ? <><Bookmark className="h-4 w-4 fill-primary text-primary" /> Saved</> : <><BookmarkPlus className="h-4 w-4" /> Watchlist</>}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-contact"><Send className="h-4 w-4" /> Request Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request contact with {listing.companyName}</DialogTitle>
                <DialogDescription>Introduce yourself and explain your interest. If accepted, a private conversation opens.</DialogDescription>
              </DialogHeader>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. We're a strategic acquirer in the logistics space looking to expand in western India…"
                rows={5}
                data-testid="input-contact-message"
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => requestContact.mutate()} disabled={!message.trim() || requestContact.isPending} data-testid="button-send-contact">
                  {requestContact.isPending ? "Sending…" : "Send Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key metrics strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-card-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-bold font-mono mt-1">{formatINR(listing.revenue)}</p>
        </Card>
        <Card className="p-4 border-card-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">EBITDA</p>
          <p className="text-xl font-bold font-mono mt-1">{formatINR(listing.ebitda)}</p>
          <p className="text-xs text-muted-foreground">{listing.ebitdaMargin != null ? `${formatPct(listing.ebitdaMargin, true)} margin` : ""}</p>
        </Card>
        <Card className="p-4 border-card-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Growth</p>
          <p className="text-xl font-bold font-mono mt-1 text-green-400">{listing.revenueGrowthRate != null ? formatPct(listing.revenueGrowthRate, true) : "—"}</p>
        </Card>
        <Card className="p-4 border-card-border stat-glow">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Asking Price</p>
          <p className="text-xl font-bold font-mono mt-1 text-primary">{formatINR(listing.askingValuation)}</p>
        </Card>
      </div>

      {listing.description && (
        <Card className="p-5 border-card-border mb-6">
          <h2 className="font-semibold text-sm mb-2 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
        </Card>
      )}

      {/* Valuation + Intelligence */}
      <Tabs defaultValue="valuation">
        <TabsList>
          <TabsTrigger value="valuation" className="gap-2" data-testid="tab-valuation"><TrendingUp className="h-4 w-4" /> Valuation</TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-2" data-testid="tab-intelligence"><TrendingUp className="h-4 w-4" /> Deal Intelligence</TabsTrigger>
        </TabsList>
        <TabsContent value="valuation" className="mt-4">
          {valuation ? <ValuationDisplay v={valuation} /> : <p className="text-sm text-muted-foreground">Computing valuation…</p>}
        </TabsContent>
        <TabsContent value="intelligence" className="mt-4">
          {intel ? <IntelligenceDisplay intel={intel} /> : <p className="text-sm text-muted-foreground">Computing intelligence…</p>}
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}
