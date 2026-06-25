import { useQuery } from "@tanstack/react-query";
import {
  GitBranch, Clock, CheckCircle2, XCircle, MessageSquare, Building2,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import type { ContactRequest } from "@/lib/types";

const STAGES: { id: ContactRequest["status"]; label: string; icon: React.ElementType; color: string }[] = [
  { id: "pending",  label: "Pending Review",  icon: Clock,          color: "text-amber-400"  },
  { id: "accepted", label: "In Discussion",   icon: MessageSquare,  color: "text-blue-400"   },
  { id: "rejected", label: "Declined",        icon: XCircle,        color: "text-red-400/70" },
  { id: "closed",   label: "Closed",          icon: CheckCircle2,   color: "text-green-400"  },
];

export default function SellerPipeline() {
  const [, navigate] = useLocation();

  const { data: requests, isLoading } = useQuery<ContactRequest[]>({
    queryKey: ["contact-requests"],
    queryFn: () => api.get("/contact_requests"),
  });

  const byStatus = (status: ContactRequest["status"]) =>
    (requests ?? []).filter((r) => r.status === status);

  return (
    <PortalLayout title="Deal Pipeline" subtitle="Track your deals from enquiry through to close">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STAGES.map(({ id, label, icon: Icon, color }) => {
          const count = byStatus(id).length;
          return (
            <Card key={id} className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl num font-bold">{count}</p>
            </Card>
          );
        })}
      </div>

      {/* Kanban columns */}
      {isLoading ? (
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-4 items-start">
          {STAGES.map(({ id, label, icon: Icon, color }) => {
            const cards = byStatus(id);
            return (
              <div key={id} className="space-y-3">
                <div className={`flex items-center gap-2 pb-2 border-b border-border`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-xs font-medium">{label}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{cards.length}</Badge>
                </div>
                {cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-5 text-center">
                    <p className="text-xs text-muted-foreground">No deals</p>
                  </div>
                ) : (
                  cards.map((req) => (
                    <Card key={req.id} className="p-4 border-border space-y-2 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate(`/seller/requests`)}>
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {(req as ContactRequest & { investorName?: string }).investorName ?? "Investor"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {(req as ContactRequest & { listingName?: string }).listingName ?? `Listing #${req.listingId}`}
                          </p>
                        </div>
                      </div>
                      {req.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {req.message}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                        {req.ndaAgreed && (
                          <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">NDA</Badge>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && (requests ?? []).length === 0 && (
        <div className="mt-8 text-center">
          <Card className="p-10 border-border max-w-md mx-auto">
            <GitBranch className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">No enquiries yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              When investors express interest in your listings, their contact requests will appear here as your deal pipeline.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/seller/listings")}>
              View My Listings
            </Button>
          </Card>
        </div>
      )}
    </PortalLayout>
  );
}
