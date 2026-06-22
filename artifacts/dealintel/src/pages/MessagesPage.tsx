import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MessageSquare, Send, User, ArrowLeft } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { MessageThread, Message } from "@/lib/types";

export default function MessagesPage({ threadId }: { threadId?: number }) {
  const [, navigate] = useLocation();
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: threads } = useQuery<MessageThread[]>({
    queryKey: ["messages"],
    queryFn: () => api.get("/messages"),
    refetchInterval: 5000,
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["messages", threadId],
    queryFn: () => api.get(`/messages/${threadId}`),
    enabled: !!threadId,
    refetchInterval: threadId ? 3000 : false,
  });

  const activeThread = threads?.find((t) => t.id === threadId);

  const send = useMutation({
    mutationFn: () => api.post(`/messages/${threadId}`, { content: draft }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["messages", threadId] });
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <PortalLayout title="Messages" subtitle="Conversations with buyers and sellers">
      <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Thread list */}
        <Card className={`border-card-border overflow-y-auto ${threadId ? "hidden lg:block" : ""}`}>
          {(threads?.length ?? 0) === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          )}
          <div className="divide-y divide-border">
            {threads?.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/messages/${t.id}`)}
                className={`w-full text-left p-4 deal-row ${t.id === threadId ? "deal-row-selected" : ""}`}
                data-testid={`thread-${t.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.otherPartyName}</p>
                      {t.listingName && <p className="text-xs text-muted-foreground truncate">{t.listingName}</p>}
                    </div>
                  </div>
                </div>
                {t.lastMessage && <p className="text-xs text-muted-foreground mt-2 truncate">{t.lastMessage}</p>}
              </button>
            ))}
          </div>
        </Card>

        {/* Conversation */}
        <Card className={`lg:col-span-2 border-card-border flex flex-col ${!threadId ? "hidden lg:flex" : ""}`}>
          {!threadId && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a conversation</p>
              </div>
            </div>
          )}

          {threadId && (
            <>
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => navigate("/messages")}><ArrowLeft className="h-4 w-4" /></Button>
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-sm">{activeThread?.otherPartyName ?? "Conversation"}</p>
                  {activeThread?.listingName && <Badge variant="outline" className="text-xs mt-0.5">{activeThread.listingName}</Badge>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages?.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); if (draft.trim()) send.mutate(); }}
                className="p-4 border-t border-border flex items-center gap-2"
              >
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" data-testid="input-message" />
                <Button type="submit" size="icon" disabled={!draft.trim() || send.isPending} data-testid="button-send"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </PortalLayout>
  );
}
