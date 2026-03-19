import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Clock, CheckCircle2, MessageSquare } from "lucide-react";
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

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
  responded: { icon: CheckCircle2, color: "text-emerald-500", label: "Responded" },
  closed: { icon: X, color: "text-muted-foreground", label: "Closed" },
};

const EnquiryDetailModal = ({ inquiry, open, onClose, onStatusChange }: EnquiryDetailModalProps) => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [responses, setResponses] = useState<any[]>([]);
  const [newResponse, setNewResponse] = useState("");
  const [sending, setSending] = useState(false);
  const property = properties.find((p) => p.id === inquiry?.property_id);

  useEffect(() => {
    if (!inquiry) return;
    (supabase as any)
      .from("enquiry_responses")
      .select("*")
      .eq("inquiry_id", inquiry.id)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => setResponses(data || []));
  }, [inquiry]);

  const handleSendResponse = async () => {
    if (!newResponse.trim() || !user) return;
    setSending(true);
    await (supabase as any).from("enquiry_responses").insert({
      inquiry_id: inquiry.id,
      responder_id: user.id,
      message: newResponse.trim(),
    });

    // Update inquiry status to responded
    await (supabase as any)
      .from("inquiries")
      .update({ status: "responded" })
      .eq("id", inquiry.id);

    const { data } = await (supabase as any)
      .from("enquiry_responses")
      .select("*")
      .eq("inquiry_id", inquiry.id)
      .order("created_at", { ascending: true });
    setResponses(data || []);
    setNewResponse("");
    setSending(false);
    onStatusChange?.();
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
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    inquiry.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                    inquiry.status === "responded" ? "bg-emerald-500/10 text-emerald-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </span>
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {property?.title || "General Inquiry"}
                </h2>
                {property && (
                  <p className="text-sm text-muted-foreground mt-1">{property.location}</p>
                )}
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Original inquiry */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-foreground">{inquiry.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(inquiry.created_at).toLocaleDateString(undefined, {
                      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground/80">{inquiry.message || "No message provided."}</p>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{inquiry.email}</span>
                  {inquiry.phone && <span>{inquiry.phone}</span>}
                </div>
              </div>

              {/* Responses */}
              {responses.map((r: any) => (
                <div key={r.id} className="bg-primary/5 border border-primary/10 rounded-xl p-4 ml-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-primary">Admin Response</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{r.message}</p>
                </div>
              ))}

              {responses.length === 0 && (
                <div className="text-center py-6">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No responses yet</p>
                </div>
              )}
            </div>

            {/* Admin Response Form */}
            {isAdmin && (
              <div className="p-6 border-t border-border">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Type your response..."
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    onClick={handleSendResponse}
                    disabled={!newResponse.trim() || sending}
                    size="icon"
                    className="shrink-0 self-end h-10 w-10"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnquiryDetailModal;
