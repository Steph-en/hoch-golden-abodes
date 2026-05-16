import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Clock, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { properties } from "@/data/properties";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";

interface EnquiryDetailModalProps {
  inquiry: any;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

type SenderRole = "user" | "admin" | "super_admin";

type ChatMessage = {
  id: string;
  enquiry_id: string;
  sender_id: string | null;
  sender_role: SenderRole;
  message: string;
  attachment_url: string | null;
  created_at: string;
};

type ReceiptRow = {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string | null;
};

const statusConfig: Record<string, { icon: any; label: string }> = {
  pending: { icon: Clock, label: "Pending" },
  responded: { icon: Clock, label: "Responded" },
  closed: { icon: X, label: "Closed" },
};

const EnquiryDetailModal = ({ inquiry, open, onClose, onStatusChange }: EnquiryDetailModalProps) => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();

  const property = properties.find((p) => p.id === inquiry?.property_id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canParticipate = useMemo(() => {
    if (!user || !inquiry) return false;
    if (isAdmin) return true;
    return inquiry.user_id === user.id;
  }, [user, inquiry, isAdmin]);

  const myRole: SenderRole | null = useMemo(() => {
    if (!user) return null;
    if (isAdmin) return "admin";
    return inquiry?.user_id === user.id ? "user" : null;
  }, [user, inquiry, isAdmin]);

  const enqueueTyping = () => {
    if (!open) return;
    setTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setTyping(false), 1200);
  };

  useEffect(() => {
    if (!inquiry || !open) return;

    let mounted = true;
    setLoadingHistory(true);

    const load = async () => {
      // Load full thread
      const { data, error } = await (supabase as any)
        .from("enquiry_messages")
        .select("*")
        .eq("enquiry_id", inquiry.id)
        .order("created_at", { ascending: true });

      if (!mounted) return;
      if (error) {
        console.error("Failed to load enquiry messages", error);
        setMessages([]);
      } else {
        setMessages((data || []) as ChatMessage[]);
      }

      // Mark visible messages as read for the current user
      if (user && (inquiry.user_id === user.id || isAdmin)) {
        const ids = (data || []).map((m: any) => m.id);
        if (ids.length) {
          await Promise.all(
            ids.map(async (message_id: string) => {
              // UPSERT receipts (unique on message_id+user_id)
              const { error: rErr } = await (supabase as any)
                .from("enquiry_message_receipts")
                .upsert(
                  {
                    message_id,
                    user_id: user.id,
                    read_at: new Date().toISOString(),
                  },
                  { onConflict: "message_id,user_id" }
                );
              if (rErr) {
                // Ignore receipt errors to avoid blocking chat
                console.debug("receipt upsert failed", rErr);
              }
            })
          );
        }
      }

      setLoadingHistory(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [inquiry, open, user, isAdmin]);

  useEffect(() => {
    if (!inquiry || !open) return;
    if (!user) return;

    const channel = supabase
      .channel(`enquiry-messages-${inquiry.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "enquiry_messages",
          filter: `enquiry_id=eq.${inquiry.id}`,
        },
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
          // Scroll on new messages
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inquiry, open, user]);

  useEffect(() => {
    if (!open) return;
    // Auto-scroll when history changes
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "auto", block: "end" }), 0);
  }, [messages, open]);

  const handleSend = async () => {
    if (!canParticipate) return;
    if (!user) return;
    if (!newMessage.trim()) return;

    const payloadMessage = newMessage.trim();
    setSending(true);

    try {
      // Update inquiry status based on sender role
      const newStatus = isAdmin ? "responded" : inquiry.status;
      if (newStatus !== inquiry.status) {
        await (supabase as any).from("inquiries").update({ status: newStatus }).eq("id", inquiry.id);
      }

      const sender_role: SenderRole = myRole || (isAdmin ? "admin" : "user");
      const sender_id: string | null = sender_role === "user" ? user.id : user.id;

      const { data: inserted, error: insertError } = await (supabase as any)
        .from("enquiry_messages")
        .insert({
          enquiry_id: inquiry.id,
          sender_id,
          sender_role,
          message: payloadMessage,
          attachment_url: null,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("enquiry_messages insert failed", insertError);
        throw insertError;
      }

      // Create/mark receipt for sender (use the inserted message id, not stale local state)
      const insertedId: string | undefined = inserted?.id;
      if (insertedId) {
        const { error: receiptError } = await (supabase as any)
          .from("enquiry_message_receipts")
          .upsert(
            {
              message_id: insertedId,
              user_id: user.id,
              read_at: new Date().toISOString(),
            },
            { onConflict: "message_id,user_id" }
          );

        if (receiptError) {
          console.error("enquiry_message_receipts upsert failed", receiptError);
          // best-effort; receiver will mark read when viewing
        }
      } else {
        console.warn("No inserted message id returned; skipping receipt upsert");
      }



      setNewMessage("");
      onStatusChange?.();
    } catch (e) {
      console.error("send message failed", e);
    } finally {
      setSending(false);
    }
  };

  if (!inquiry) return null;

  const status = statusConfig[inquiry.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      inquiry.status === "pending"
                        ? "bg-amber-500/10 text-amber-600"
                        : inquiry.status === "responded"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </span>
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground">{property?.title || "General Inquiry"}</h2>
                {property && <p className="text-sm text-muted-foreground mt-1">{property.location}</p>}
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Chat thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {/* Original inquiry context */}
              <div className="bg-muted/50 rounded-xl p-4 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-foreground">{inquiry.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(inquiry.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground/80">{inquiry.message || "No message provided."}</p>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{inquiry.email}</span>
                  {inquiry.phone && <span>{inquiry.phone}</span>}
                </div>
              </div>

              {loadingHistory && messages.length === 0 ? (
                <div className="space-y-2">
                  <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
                  <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const isMine = myRole ? (m.sender_role === "user" && myRole === "user") || (m.sender_role !== "user" && myRole !== "user") : false;
                    const align = isMine ? "justify-end" : "justify-start";
                    const bubble = isMine ? "bg-primary text-primary-foreground" : "bg-muted/50";

                    return (
                      <div key={m.id} className={`flex ${align}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${bubble} border ${isMine ? "border-primary/30" : "border-border"}`}>
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</div>
                          <div className={`mt-2 text-[11px] opacity-80 ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {typing && (
                    <div className="text-sm text-muted-foreground">Typing…</div>
                  )}
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* Composer */}
            {canParticipate && inquiry.status !== "closed" ? (
              <div className="p-6 border-t border-border">
                <div className="flex gap-3 items-end">
                  <Textarea
                    placeholder="Type your message…"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      enqueueTyping();
                    }}
                    rows={2}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button
                    onClick={() => void handleSend()}
                    disabled={!newMessage.trim() || sending}
                    size="icon"
                    className="shrink-0 self-end h-10 w-10"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 border-t border-border text-center text-sm text-muted-foreground">
                {inquiry.status === "closed" ? "Conversation closed" : "You can’t participate in this enquiry"}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnquiryDetailModal;



