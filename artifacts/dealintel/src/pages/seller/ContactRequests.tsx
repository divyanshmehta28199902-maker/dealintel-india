import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Check, X, MessageSquare, User } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { ContactRequest } from "@/lib/types";

export default function ContactRequests() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: user } = useCurrentUser();

  const { data: requests, isLoading } = useQuery<ContactRequest[]>({
    queryKey: ["contact-requests"],
    queryFn: () => api.get("/contact-requests"),
  });

  // Only inquiries addressed to this seller (incoming)
  const incoming = (requests ?? []).filter((r) => r.investorId !== user?.id);

  const accept = useMutation({
    mutationFn: (id: number) => api.post<ContactRequest>(`/contact-requests/${id}/accept`),
    onSuccess: (cr) => {
      qc.invalidateQueries({ queryKey: ["contact-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "seller"] });
      qc.invalidateQueries({ queryKey: ["messages"] });
      toast({ title: "Inquiry accepted", description: "A conversation has been opened." });
      if (cr.threadId) navigate(`/messages/${cr.threadId}`);
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  const decline = useMutation({
    mutationFn: (id: number) => api.post(`/contact-requests/${id}/decline`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact-requests"] });
      toast({ title: "Inquiry declined" });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <PortalLayout title="Investor Inquiries" subtitle="Contact requests from investors interested in your businesses">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && incoming.length === 0 && (
        <Card className="p-12 text-center border-card-border">
          <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold">No inquiries yet</h3>
          <p className="text-sm text-muted-foreground mt-1">When investors request contact, they'll appear here.</p>
        </Card>
      )}

      <div className="space-y-3 max-w-3xl">
        {incoming.map((r) => (
          <Card key={r.id} className="p-5 border-card-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{r.investorName ?? "Investor"}</p>
                    <span className="text-xs text-muted-foreground">interested in</span>
                    <Badge variant="outline" className="text-xs">{r.listingName}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{r.message}</p>
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>

            {r.status === "pending" && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Button size="sm" className="gap-2" onClick={() => accept.mutate(r.id)} disabled={accept.isPending} data-testid={`button-accept-${r.id}`}>
                  <Check className="h-4 w-4" /> Accept & Message
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => decline.mutate(r.id)} disabled={decline.isPending} data-testid={`button-decline-${r.id}`}>
                  <X className="h-4 w-4" /> Decline
                </Button>
              </div>
            )}

            {r.status === "accepted" && r.threadId && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate(`/messages/${r.threadId}`)}>
                  <MessageSquare className="h-4 w-4" /> Open Conversation
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </PortalLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    accepted: { label: "Accepted", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
    declined: { label: "Declined", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const s = map[status] ?? map.pending;
  return <Badge variant="outline" className={`text-xs shrink-0 ${s.cls}`}>{s.label}</Badge>;
}
