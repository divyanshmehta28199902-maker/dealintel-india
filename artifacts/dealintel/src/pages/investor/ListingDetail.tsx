import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin, Users, Calendar, Bookmark, BookmarkPlus, Send,
  Building2, Eye, TrendingUp, GitBranch, Shield, CheckSquare,
  FileText, BarChart3, MessageSquare, StickyNote, Lock,
  IndianRupee, Activity, Clock,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ValuationDisplay } from "@/components/ValuationDisplay";
import { IntelligenceDisplay } from "@/components/IntelligenceDisplay";
import { api } from "@/lib/api";
import { formatINR, formatPct } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { Listing, ValuationResult, IntelligenceResult, WatchlistItem, Pipeline } from "@/lib/types";

type Tab = "overview" | "financials" | "valuation" | "dataroom" | "analytics" | "messages" | "notes";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview",   label: "Overview",    icon: Building2 },
  { id: "financials", label: "Financials",  icon: IndianRupee },
  { id: "valuation",  label: "Valuation",   icon: TrendingUp },
  { id: "dataroom",   label: "Data Room",   icon: FileText },
  { id: "analytics",  label: "Analytics",   icon: BarChart3 },
  { id: "messages",   label: "Messages",    icon: MessageSquare },
  { id: "notes",      label: "Notes",       icon: StickyNote },
];

function ValuationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> Analyzing deal…
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border rounded-lg p-4 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ListingDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState("");
  const [ndaAgreed, setNdaAgreed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);

  /* Notes — persisted in localStorage per-listing */
  const notesKey = `dealintel-notes-${id}`;
  const [notes, setNotes] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(notesKey) ?? "") : "",
  );
  function saveNotes(v: string) {
    setNotes(v);
    localStorage.setItem(notesKey, v);
  }

  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: ["listing", id],
    queryFn: () => api.get(`/listings/${id}`),
  });

  const { data: valuation, isLoading: valLoading } = useQuery<ValuationResult>({
    queryKey: ["listing", id, "valuation"],
    queryFn: () => api.get(`/listings/${id}/valuation`),
    enabled: !!listing,
  });

  const { data: intel, isLoading: intelLoading } = useQuery<IntelligenceResult>({
    queryKey: ["listing", id, "intelligence"],
    queryFn: () => api.get(`/listings/${id}/intelligence`),
    enabled: !!listing,
  });

  const { data: watchlist } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: () => api.get("/watchlist"),
  });
  const watched = new Set((watchlist ?? []).map((w) => w.listingId)).has(id);

  const { data: pipeline } = useQuery<Pipeline[]>({
    queryKey: ["pipeline"],
    queryFn: () => api.get("/pipeline"),
  });
  const inPipeline = (pipeline ?? []).some((p) => p.listingId === id);
  const pipelineDeal = (pipeline ?? []).find((p) => p.listingId === id);

  const toggleWatch = useMutation({
    mutationFn: async () =>
      watched ? api.delete(`/watchlist/${id}`) : api.post(`/watchlist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  const requestContact = useMutation({
    mutationFn: () => api.post(`/listings/${id}/contact`, { message, ndaAgreed }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "investor"] });
      setDialogOpen(false);
      setMessage("");
      setNdaAgreed(false);
      toast({ title: "Contact request sent", description: "The seller will be notified." });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  const addToPipeline = useMutation({
    mutationFn: () => api.post<Pipeline>("/pipeline", { listingId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      setPipelineDialogOpen(false);
      toast({ title: "Added to pipeline", description: "Track this deal in your Deal Pipeline." });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <PortalLayout backTo="/investor/marketplace">
        <div className="space-y-4 animate-pulse">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-4 gap-4 mt-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      </PortalLayout>
    );
  }
  if (!listing) {
    return (
      <PortalLayout backTo="/investor/marketplace" title="Not found">
        <p className="text-sm text-muted-foreground">This listing doesn't exist or has been removed.</p>
      </PortalLayout>
    );
  }

  const contactRequest = undefined; /* would come from API */

  return (
    <PortalLayout backTo="/investor/marketplace">
      {/* Company header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{listing.companyName}</h1>
            <Badge variant="outline">{listing.industry}</Badge>
            <Badge variant="outline" className="capitalize">{listing.stage}</Badge>
            {listing.isVerified && (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs gap-1">
                <Shield className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {listing.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {listing.city}{listing.state ? `, ${listing.state}` : ""}
              </span>
            )}
            {listing.employeeCount && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {listing.employeeCount} employees
              </span>
            )}
            {listing.foundedYear && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Est. {listing.foundedYear}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {listing.viewCount} views
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toggleWatch.mutate()}
            data-testid="button-watch"
          >
            {watched
              ? <><Bookmark className="h-4 w-4 fill-primary text-primary" /> Saved</>
              : <><BookmarkPlus className="h-4 w-4" /> Watchlist</>}
          </Button>

          <Button
            variant={inPipeline ? "outline" : "secondary"}
            size="sm"
            className="gap-2"
            disabled={inPipeline || addToPipeline.isPending}
            onClick={() => !inPipeline && setPipelineDialogOpen(true)}
            data-testid="button-pipeline"
          >
            <GitBranch className="h-4 w-4" />
            {inPipeline ? "In Pipeline" : "Track Deal"}
          </Button>

          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) { setMessage(""); setNdaAgreed(false); }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" data-testid="button-contact">
                <Send className="h-4 w-4" /> Request Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request contact with {listing.companyName}</DialogTitle>
                <DialogDescription>
                  Introduce yourself and explain your interest. If accepted, a private conversation opens.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. We're a strategic acquirer in the logistics space…"
                rows={5}
                data-testid="input-contact-message"
              />
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <Checkbox
                  id="nda-agree"
                  checked={ndaAgreed}
                  onCheckedChange={(v) => setNdaAgreed(!!v)}
                  className="mt-0.5"
                  data-testid="checkbox-nda"
                />
                <label htmlFor="nda-agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  <span className="font-medium text-foreground flex items-center gap-1.5 mb-1">
                    <Shield className="h-3.5 w-3.5 text-primary" /> I agree to a mutual NDA
                  </span>
                  I agree to keep all information shared by the seller strictly confidential. Violation may result in legal action under applicable Indian law.
                </label>
              </div>
              {ndaAgreed && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckSquare className="h-3.5 w-3.5" />
                  NDA acknowledgement will be timestamped and recorded
                </div>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => requestContact.mutate()}
                  disabled={!message.trim() || requestContact.isPending}
                  data-testid="button-send-contact"
                >
                  {requestContact.isPending ? "Sending…" : "Send Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key metrics strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-bold num mt-1">{formatINR(listing.revenue)}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">EBITDA</p>
          <p className="text-xl font-bold num mt-1">{formatINR(listing.ebitda)}</p>
          {listing.ebitdaMargin != null && (
            <p className="text-xs text-muted-foreground">{formatPct(listing.ebitdaMargin, true)} margin</p>
          )}
        </Card>
        <Card className="p-4 border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Growth</p>
          <p className="text-xl font-bold num mt-1 text-green-400">
            {listing.revenueGrowthRate != null ? formatPct(listing.revenueGrowthRate, true) : "—"}
          </p>
        </Card>
        <Card className="p-4 border-border stat-glow">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Asking Price</p>
          <p className="text-xl font-bold num mt-1 text-primary">{formatINR(listing.askingValuation)}</p>
        </Card>
      </div>

      {/* Deal workspace tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex items-center gap-0 overflow-x-auto">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === tid
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {listing.description && (
            <Card className="p-5 border-border">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> About the Business
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
            </Card>
          )}
          <div className="grid md:grid-cols-2 gap-5">
            <Card className="p-5 border-border">
              <h2 className="font-semibold text-sm mb-4">Business Details</h2>
              <div className="space-y-0 divide-y divide-border">
                {[
                  { label: "Industry", value: listing.industry },
                  { label: "Business stage", value: listing.stage },
                  { label: "City", value: listing.city ?? "—" },
                  { label: "State", value: listing.state ?? "—" },
                  { label: "Employees", value: listing.employeeCount ?? "—" },
                  { label: "Founded", value: listing.foundedYear ?? "—" },
                  { label: "Profile views", value: listing.viewCount },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-medium capitalize">{String(value)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5 border-border">
              <h2 className="font-semibold text-sm mb-4">Deal Status</h2>
              <div className="space-y-0 divide-y divide-border">
                {[
                  { label: "Status", value: <Badge variant="outline" className="text-xs capitalize">{listing.status}</Badge> },
                  { label: "Verified", value: listing.isVerified
                    ? <Badge className="text-xs bg-green-500/15 text-green-400 border-green-500/30">Verified</Badge>
                    : <span className="text-xs text-muted-foreground">Pending</span> },
                  { label: "Featured", value: listing.isFeatured
                    ? <Badge className="text-xs bg-primary/15 text-primary border-primary/30">Featured</Badge>
                    : <span className="text-xs text-muted-foreground">Standard</span> },
                  { label: "In your pipeline", value: inPipeline
                    ? <Badge className="text-xs bg-blue-500/15 text-blue-400 border-blue-500/30">Yes</Badge>
                    : <span className="text-xs text-muted-foreground">No</span> },
                  { label: "Watchlisted", value: watched
                    ? <Badge className="text-xs bg-amber-500/15 text-amber-400 border-amber-500/30">Yes</Badge>
                    : <span className="text-xs text-muted-foreground">No</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── FINANCIALS ── */}
      {tab === "financials" && (
        <div className="space-y-5">
          <Card className="p-5 border-border">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" /> Financial Summary
            </h2>
            <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="space-y-0 divide-y divide-border md:pr-6">
                {[
                  { label: "Annual Revenue", value: formatINR(listing.revenue), highlight: false },
                  { label: "EBITDA", value: formatINR(listing.ebitda), highlight: false },
                  { label: "EBITDA Margin", value: listing.ebitdaMargin != null ? formatPct(listing.ebitdaMargin, true) : "—", highlight: false },
                  { label: "Revenue Growth Rate", value: listing.revenueGrowthRate != null ? formatPct(listing.revenueGrowthRate, true) : "—", highlight: listing.revenueGrowthRate != null && listing.revenueGrowthRate > 0 },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm num font-semibold ${highlight ? "text-green-400" : ""}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-0 divide-y divide-border md:pl-6">
                {[
                  { label: "Asking Valuation", value: formatINR(listing.askingValuation), primary: true },
                  { label: "Debt Ratio", value: listing.debtRatio != null ? formatPct(listing.debtRatio, true) : "—", primary: false },
                  { label: "Customer Concentration", value: listing.customerConcentration != null ? formatPct(listing.customerConcentration, true) : "—", primary: false },
                  { label: "Revenue Multiple (ask)", value: listing.revenue > 0 ? `${(listing.askingValuation / listing.revenue).toFixed(1)}x` : "—", primary: false },
                ].map(({ label, value, primary }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm num font-semibold ${primary ? "text-primary" : ""}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5 border-border">
            <h2 className="font-semibold text-sm mb-4">Key Ratios</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "EV / Revenue", value: listing.revenue > 0 ? `${(listing.askingValuation / listing.revenue).toFixed(1)}x` : "—" },
                { label: "EV / EBITDA", value: listing.ebitda > 0 ? `${(listing.askingValuation / listing.ebitda).toFixed(1)}x` : "—" },
                { label: "EBITDA Margin", value: listing.ebitdaMargin != null ? formatPct(listing.ebitdaMargin, true) : "—" },
                { label: "Debt Ratio", value: listing.debtRatio != null ? formatPct(listing.debtRatio, true) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg border border-border text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg num font-semibold mt-1">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── VALUATION ── */}
      {tab === "valuation" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Valuation Analysis
            </h2>
            {valLoading ? <ValuationSkeleton /> : valuation ? <ValuationDisplay v={valuation} /> : (
              <Card className="p-8 text-center border-border">
                <p className="text-sm text-muted-foreground">Valuation data unavailable.</p>
              </Card>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Deal Intelligence
            </h2>
            {intelLoading ? <ValuationSkeleton /> : intel ? <IntelligenceDisplay intel={intel} /> : (
              <Card className="p-8 text-center border-border">
                <p className="text-sm text-muted-foreground">Intelligence data unavailable.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── DATA ROOM ── */}
      {tab === "dataroom" && (
        <div className="space-y-5">
          {!ndaAgreed ? (
            <Card className="p-8 text-center border-border max-w-lg mx-auto">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">NDA Required</h3>
              <p className="text-sm text-muted-foreground mb-6">
                The Data Room is only accessible after agreeing to a mutual NDA and having an active contact request accepted by the seller.
              </p>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 text-left mb-4">
                <Checkbox
                  id="nda-dataroom"
                  checked={ndaAgreed}
                  onCheckedChange={(v) => setNdaAgreed(!!v)}
                  className="mt-0.5"
                />
                <label htmlFor="nda-dataroom" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                  <span className="font-medium text-foreground block mb-1 flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-primary" /> I agree to a mutual NDA
                  </span>
                  I agree to keep all information shared by the seller strictly confidential under applicable Indian law.
                </label>
              </div>
            </Card>
          ) : (
            <>
              <Card className="p-4 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-green-400 shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium text-green-400">NDA in effect</span>
                    <span className="text-muted-foreground ml-2">All data is confidential. Unauthorised disclosure is a legal violation.</span>
                  </p>
                </div>
              </Card>
              <Card className="p-12 text-center border-border">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">Data Room is empty</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Once the seller accepts your contact request and grants access, confidential documents will appear here — financials, contracts, IP, and due diligence materials.
                </p>
                <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setDialogOpen(true)}>
                  <Send className="h-3.5 w-3.5" /> Request Contact
                </Button>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {tab === "analytics" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-border text-center">
              <p className="text-xs text-muted-foreground">Profile Views</p>
              <p className="text-2xl num font-semibold mt-1">{listing.viewCount}</p>
            </Card>
            <Card className="p-4 border-border text-center">
              <p className="text-xs text-muted-foreground">Deal Stage</p>
              <p className="text-sm font-semibold mt-2 capitalize">{listing.stage}</p>
            </Card>
            <Card className="p-4 border-border text-center">
              <p className="text-xs text-muted-foreground">Pipeline Stage</p>
              <p className="text-sm font-semibold mt-2 capitalize">
                {pipelineDeal ? pipelineDeal.stage.replace("_", " ") : "Not tracked"}
              </p>
            </Card>
            <Card className="p-4 border-border text-center">
              <p className="text-xs text-muted-foreground">Watchlisted</p>
              <p className="text-sm font-semibold mt-2">{watched ? "Yes" : "No"}</p>
            </Card>
          </div>

          <Card className="p-5 border-border">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Deal Attractiveness
            </h3>
            <div className="space-y-3">
              {[
                { label: "Revenue multiple vs ask", value: listing.revenue > 0 ? `${(listing.askingValuation / listing.revenue).toFixed(1)}x rev` : "—", note: "Typical SME range: 1–3x" },
                { label: "EBITDA multiple", value: listing.ebitda > 0 ? `${(listing.askingValuation / listing.ebitda).toFixed(1)}x EBITDA` : "N/A", note: "SME benchmark: 4–8x" },
                { label: "Growth rate", value: listing.revenueGrowthRate != null ? formatPct(listing.revenueGrowthRate, true) : "—", note: "YoY revenue growth" },
                { label: "Debt burden", value: listing.debtRatio != null ? formatPct(listing.debtRatio, true) : "—", note: "Lower is better" },
              ].map(({ label, value, note }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{note}</p>
                  </div>
                  <span className="text-sm num font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {pipelineDeal && (
            <Card className="p-5 border-border">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Pipeline Activity
              </h3>
              <div className="space-y-2">
                {[...(pipelineDeal.activityLog ?? [])].reverse().slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs capitalize">{a.stage.replace("_", " ")}</span>
                      {a.note && <span className="text-xs text-muted-foreground ml-2">— {a.note}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── MESSAGES ── */}
      {tab === "messages" && (
        <div className="max-w-lg">
          <Card className="p-8 text-center border-border">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Deal Conversations</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Once a seller accepts your contact request, a private deal thread opens. All messages for this deal are stored in your Messages inbox.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setDialogOpen(true)}
              >
                <Send className="h-3.5 w-3.5" /> Request Contact
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── NOTES ── */}
      {tab === "notes" && (
        <div className="max-w-2xl space-y-3">
          <Card className="p-5 border-border">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" /> Private Notes
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Your notes are saved locally in this browser. They are private to you and never shared.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => saveNotes(e.target.value)}
              placeholder={`Notes on ${listing.companyName}…\n\n• Key observations\n• Due diligence questions\n• Valuation thoughts\n• Next steps`}
              rows={14}
              className="font-mono text-xs resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {notes.length > 0 ? `${notes.length} characters · Auto-saved` : "Start typing to save a note"}
            </p>
          </Card>
        </div>
      )}

      {/* Add to Pipeline confirmation dialog */}
      <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" /> Track {listing.companyName}
            </DialogTitle>
            <DialogDescription>
              Add this deal to your Pipeline to track it from interest through to close.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPipelineDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => addToPipeline.mutate()} disabled={addToPipeline.isPending}>
              {addToPipeline.isPending ? "Adding…" : "Add to Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
