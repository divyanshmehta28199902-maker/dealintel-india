import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Building2, Eye, Plus, Trash2, MapPin } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { formatINR, formatPct } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { Listing } from "@/lib/types";

export default function MyListings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["listings", "my"],
    queryFn: () => api.get("/listings/my"),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/listings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings", "my"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "seller"] });
      toast({ title: "Listing deleted" });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <PortalLayout
      title="My Listings"
      subtitle="All your business listings"
      action={<Link href="/seller/list"><Button className="gap-2"><Plus className="h-4 w-4" /> List Business</Button></Link>}
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && (listings?.length ?? 0) === 0 && (
        <Card className="p-12 text-center border-card-border">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold">No listings yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first listing to start attracting investors.</p>
          <Link href="/seller/list"><Button className="gap-2"><Plus className="h-4 w-4" /> List a Business</Button></Link>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings?.map((l) => (
          <Card key={l.id} className="p-5 border-card-border flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{l.companyName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{l.industry}</p>
              </div>
              <StatusBadge status={l.status} />
            </div>

            {l.city && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {l.city}{l.state ? `, ${l.state}` : ""}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <Metric label="Revenue" value={formatINR(l.revenue)} />
              <Metric label="EBITDA" value={formatINR(l.ebitda)} />
              <Metric label="Asking" value={formatINR(l.askingValuation)} />
              <Metric label="Growth" value={l.revenueGrowthRate != null ? formatPct(l.revenueGrowthRate, true) : "—"} />
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> {l.viewCount} views</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" data-testid={`button-delete-${l.id}`}><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {l.companyName}?</AlertDialogTitle>
                    <AlertDialogDescription>This permanently removes the listing and cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(l.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))}
      </div>
    </PortalLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono font-medium">{value}</p>
    </div>
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
  return <Badge variant="outline" className={`text-xs shrink-0 ${s.cls}`}>{s.label}</Badge>;
}
