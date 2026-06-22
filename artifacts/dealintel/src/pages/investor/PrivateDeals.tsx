import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Plus, Trash2, Loader2, Sparkles, ChevronRight,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValuationDisplay } from "@/components/ValuationDisplay";
import { IntelligenceDisplay } from "@/components/IntelligenceDisplay";
import { api } from "@/lib/api";
import { formatINR, formatPct, INDUSTRIES } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PrivateDeal } from "@/lib/types";

export default function PrivateDeals() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PrivateDeal | null>(null);

  const [form, setForm] = useState({
    companyName: "", industry: "", revenue: "", ebitda: "", growthRate: "", description: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: deals, isLoading } = useQuery<PrivateDeal[]>({
    queryKey: ["deals", "private"],
    queryFn: () => api.get("/deals/private"),
    refetchInterval: (q) => {
      const data = q.state.data as PrivateDeal[] | undefined;
      return data?.some((d) => d.status === "analyzing") ? 2000 : false;
    },
  });

  const isInvestorPro = user?.tier === "investor_pro";

  const create = useMutation({
    mutationFn: () => api.post<PrivateDeal>("/deals/private", {
      companyName: form.companyName,
      industry: form.industry,
      revenue: Number(form.revenue),
      ebitda: Number(form.ebitda),
      growthRate: Number(form.growthRate),
      description: form.description || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", "private"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "investor"] });
      setOpen(false);
      setForm({ companyName: "", industry: "", revenue: "", ebitda: "", growthRate: "", description: "" });
      toast({ title: "Private deal added", description: "Valuation & intelligence are being computed." });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/deals/private/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", "private"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "investor"] });
      toast({ title: "Deal removed" });
    },
  });

  const valid = form.companyName && form.industry && form.revenue && form.ebitda && form.growthRate;

  return (
    <PortalLayout
      title="Private Deals"
      subtitle="Analyze off-market opportunities privately"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-deal"><Plus className="h-4 w-4" /> New Private Deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Private Deal</DialogTitle>
              <DialogDescription>Upload an off-market opportunity for instant valuation and risk analysis. Only visible to you.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Company Name</Label>
                <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="e.g. Target Co (or codename)" className="mt-1.5" data-testid="input-deal-name" />
              </div>
              <div>
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                  <SelectTrigger className="mt-1.5" data-testid="select-deal-industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Revenue (₹L)</Label><Input type="number" value={form.revenue} onChange={(e) => set("revenue", e.target.value)} className="mt-1.5 font-mono" data-testid="input-deal-revenue" /></div>
                <div><Label>EBITDA (₹L)</Label><Input type="number" value={form.ebitda} onChange={(e) => set("ebitda", e.target.value)} className="mt-1.5 font-mono" data-testid="input-deal-ebitda" /></div>
                <div><Label>Growth (%)</Label><Input type="number" value={form.growthRate} onChange={(e) => set("growthRate", e.target.value)} className="mt-1.5 font-mono" data-testid="input-deal-growth" /></div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Deal context, sourcing notes…" rows={2} className="mt-1.5" data-testid="input-deal-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!valid || create.isPending} data-testid="button-create-deal">
                {create.isPending ? "Adding…" : "Analyze Deal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {!isInvestorPro && (
        <Card className="p-4 border-primary/30 bg-primary/5 mb-6 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Private deal analysis is an Investor Pro feature</p>
            <p className="text-xs text-muted-foreground">You can explore it here. Upgrade for unlimited private deals and document vault access.</p>
          </div>
          <Badge className="bg-primary text-primary-foreground">Investor Pro</Badge>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && (deals?.length ?? 0) === 0 && (
        <Card className="p-12 text-center border-card-border">
          <Shield className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold">No private deals yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Add an off-market opportunity to get an instant valuation.</p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals?.map((d) => (
          <Card key={d.id} className="p-5 border-card-border flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{d.companyName}</h3>
                <Badge variant="outline" className="text-xs mt-1">{d.industry}</Badge>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" data-testid={`button-delete-deal-${d.id}`}><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {d.companyName}?</AlertDialogTitle>
                    <AlertDialogDescription>This permanently removes the private deal and its analysis.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(d.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-mono font-medium">{formatINR(d.revenue)}</p></div>
              <div><p className="text-xs text-muted-foreground">EBITDA</p><p className="font-mono font-medium">{formatINR(d.ebitda)}</p></div>
              <div><p className="text-xs text-muted-foreground">Growth</p><p className="font-mono font-medium">{formatPct(d.growthRate)}</p></div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              {d.status === "analyzing" ? (
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</span>
              ) : (
                <div className="flex items-center justify-between">
                  {d.valuation && <span className="text-sm font-mono font-semibold text-primary">{formatINR(d.valuation.suggestedPrice)}</span>}
                  <Button variant="ghost" size="sm" className="gap-1 ml-auto" onClick={() => setSelected(d)} data-testid={`button-view-deal-${d.id}`}>
                    View Analysis <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Analysis sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.companyName} — Analysis</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4">
              <Tabs defaultValue="valuation">
                <TabsList className="w-full">
                  <TabsTrigger value="valuation" className="flex-1">Valuation</TabsTrigger>
                  <TabsTrigger value="intelligence" className="flex-1">Intelligence</TabsTrigger>
                </TabsList>
                <TabsContent value="valuation" className="mt-4">
                  {selected.valuation ? <ValuationDisplay v={selected.valuation} /> : <p className="text-sm text-muted-foreground">Analysis pending.</p>}
                </TabsContent>
                <TabsContent value="intelligence" className="mt-4">
                  {selected.intelligence ? <IntelligenceDisplay intel={selected.intelligence} /> : <p className="text-sm text-muted-foreground">Analysis pending.</p>}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PortalLayout>
  );
}
