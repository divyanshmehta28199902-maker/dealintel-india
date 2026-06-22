import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bookmark, MapPin, TrendingUp, Trash2, Search } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatINR, formatPct } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { WatchlistItem } from "@/lib/types";

export default function WatchlistPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: items, isLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: () => api.get("/watchlist"),
  });

  const remove = useMutation({
    mutationFn: (listingId: number) => api.delete(`/watchlist/${listingId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "investor"] });
      toast({ title: "Removed from watchlist" });
    },
  });

  const valid = (items ?? []).filter((i) => i.listing);

  return (
    <PortalLayout title="Watchlist" subtitle="Deals you're tracking">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && valid.length === 0 && (
        <Card className="p-12 text-center border-card-border">
          <Bookmark className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold">Your watchlist is empty</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Save deals from the marketplace to track them here.</p>
          <Button className="gap-2" onClick={() => navigate("/investor/marketplace")}><Search className="h-4 w-4" /> Browse Marketplace</Button>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {valid.map((item) => {
          const l = item.listing!;
          return (
            <Card key={item.id} className="p-5 border-card-border flex flex-col hover-elevate cursor-pointer" onClick={() => navigate(`/investor/marketplace/${l.id}`)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{l.companyName}</h3>
                  <Badge variant="outline" className="text-xs mt-1">{l.industry}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); remove.mutate(l.id); }} data-testid={`button-remove-${l.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {l.city && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> {l.city}{l.state ? `, ${l.state}` : ""}</p>}

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-mono font-medium">{formatINR(l.revenue)}</p></div>
                <div><p className="text-xs text-muted-foreground">EBITDA</p><p className="font-mono font-medium">{formatINR(l.ebitda)}</p></div>
                <div><p className="text-xs text-muted-foreground">Asking</p><p className="font-mono font-medium text-primary">{formatINR(l.askingValuation)}</p></div>
                <div><p className="text-xs text-muted-foreground">Growth</p><p className="font-mono font-medium">{l.revenueGrowthRate != null ? formatPct(l.revenueGrowthRate, true) : "—"}</p></div>
              </div>

              <div className="flex items-center justify-end mt-4 pt-4 border-t border-border">
                <span className="text-xs text-primary flex items-center gap-1 font-medium">Analyze <TrendingUp className="h-3 w-3" /></span>
              </div>
            </Card>
          );
        })}
      </div>
    </PortalLayout>
  );
}
