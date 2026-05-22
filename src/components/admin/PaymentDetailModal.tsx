import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, CheckCircle2, XCircle, Clock, Eye, FileText,
  User, Building2, DollarSign, Calendar, MessageSquare,
  ZoomIn, ZoomOut, RotateCw, ExternalLink, Loader2, Shield,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  id: string;
  user_id: string;
  property_id: number;
  amount: number;
  payment_date: string;
  receipt_url: string | null;
  receipt_path: string | null;
  status: string;
  verification_status: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  payment_method: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface AuditEntry {
  id: string;
  payment_id: string;
  action: string;
  performed_by: string | null;
  performed_by_email: string | null;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface PaymentDetailModalProps {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  propertyTitle: string;
  onStatusChange: () => void;
  // Passed in from AdminPaymentsTab so both share the same resilient update logic
  updatePaymentStatus: (
    paymentId: string,
    action: "confirmed" | "rejected" | "under_review",
    notes?: string,
  ) => Promise<void>;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:      { label: "Pending",      color: "bg-amber-500/10 text-amber-600 border-amber-200",      icon: Clock },
  under_review: { label: "Under Review", color: "bg-blue-500/10 text-blue-600 border-blue-200",         icon: Eye },
  confirmed:    { label: "Confirmed",    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle2 },
  rejected:     { label: "Rejected",     color: "bg-red-500/10 text-red-600 border-red-200",            icon: XCircle },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
};

const ACTION_LABELS: Record<string, string> = {
  submitted:      "Payment submitted",
  under_review:   "Marked for review",
  confirmed:      "Payment confirmed",
  rejected:       "Payment rejected",
  notes_updated:  "Notes updated",
  document_viewed:"Document viewed",
  status_changed: "Status changed",
};

// ─── Document Viewer ──────────────────────────────────────────────────────────

const DocumentViewer = ({
  url, fileType, fileName,
}: { url: string; fileType?: string; fileName?: string }) => {
  const [zoom, setZoom]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const isImage = !!(fileType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url || ""));
  const isPDF = !!(fileType === "application/pdf" ||
    /\.pdf$/i.test(url || ""));

  // Reset state when url/type changes
  useEffect(() => {
    setError(false);
    setZoom(1);
    // For unknown types or missing url, no async load to wait for
    if (!url || (!isImage && !isPDF)) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [url, isImage, isPDF]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href     = url;
    a.download = fileName || "payment-proof";
    a.target   = "_blank";
    a.click();
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-xl border border-dashed border-border text-muted-foreground p-8">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">No document attached</p>
        <p className="text-xs mt-1">The user did not upload a payment proof.</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-destructive/5 rounded-xl border border-dashed border-destructive/20 text-muted-foreground p-8">
        <AlertTriangle className="w-10 h-10 mb-3 text-destructive/40" />
        <p className="text-sm font-medium">Could not load document</p>
        <p className="text-xs mt-1 mb-4">The file may have expired or been moved.</p>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="w-3.5 h-3.5 mr-1.5" />Try downloading instead
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-t-xl border border-b-0 border-border">
        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
          {fileName || (isPDF ? "PDF Document" : isImage ? "Image" : "Document")}
        </span>
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} disabled={zoom <= 0.5}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setZoom(z => Math.min(3, z + 0.25))} disabled={zoom >= 3}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <a href={url} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Viewer area */}
      <div className="flex-1 overflow-auto bg-muted/20 rounded-b-xl border border-border relative min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {isImage && (
          <div className="flex items-center justify-center p-4 min-h-full">
            <img
              src={url}
              alt="Payment proof"
              className="max-w-full rounded-lg shadow-md transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
          </div>
        )}

        {isPDF && (
          <iframe
            src={url}
            className="w-full h-full min-h-[400px] rounded-b-xl"
            title="Payment proof PDF"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
        )}

        {!isImage && !isPDF && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <FileText className="w-12 h-12 mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground mb-1">Preview not available</p>
            <p className="text-xs text-muted-foreground mb-4">This file type cannot be previewed directly.</p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-1.5" />Download to view
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

const PaymentDetailModal = ({
  payment, open, onClose, userName, userEmail,
  propertyTitle, onStatusChange, updatePaymentStatus,
}: PaymentDetailModalProps) => {
  const { toast }           = useToast();
  const [notes, setNotes]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [auditLog, setAuditLog]     = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [docUrl, setDocUrl]   = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [showAudit, setShowAudit]   = useState(false);

  useEffect(() => {
    if (!payment || !open) return;
    setNotes(payment.verification_notes || payment.admin_notes || "");
    setShowAudit(false);
    loadAuditLog();
    resolveDocumentUrl();
  }, [payment?.id, open]);

  // ── Audit log ──────────────────────────────────────────────────────────────
  const loadAuditLog = async () => {
    if (!payment) return;
    setLoadingAudit(true);
    // payment_audit_logs only exists after migration — fail silently if absent
    try {
      const { data } = await (supabase as any)
        .from("payment_audit_logs")
        .select("*")
        .eq("payment_id", payment.id)
        .order("created_at", { ascending: false });
      setAuditLog(data || []);
    } catch {
      setAuditLog([]);
    }
    setLoadingAudit(false);
  };

  // ── Resolve document URL (fresh signed URL when possible) ─────────────────
  const resolveDocumentUrl = useCallback(async () => {
    if (!payment) return;
    setLoadingDoc(true);

    // 1. Try payment_documents table (post-migration)
    try {
      const { data: doc } = await (supabase as any)
        .from("payment_documents")
        .select("file_path, file_url")
        .eq("payment_id", payment.id)
        .limit(1)
        .maybeSingle();

      if (doc?.file_path) {
        const { data: signed } = await supabase.storage
          .from("receipts")
          .createSignedUrl(doc.file_path, 3600);
        setDocUrl((signed as any)?.signedUrl || doc.file_url || null);
        setLoadingDoc(false);
        return;
      }
    } catch { /* table may not exist pre-migration */ }

    // 2. Try receipt_path on the payment row
    if (payment.receipt_path) {
      try {
        const { data: signed } = await supabase.storage
          .from("receipts")
          .createSignedUrl(payment.receipt_path, 3600);
        setDocUrl((signed as any)?.signedUrl || payment.receipt_url || null);
        setLoadingDoc(false);
        return;
      } catch { /* fall through */ }
    }

    // 3. Fall back to stored receipt_url as-is
    setDocUrl(payment.receipt_url || null);
    setLoadingDoc(false);
  }, [payment?.id]);

  // ── Verification actions ───────────────────────────────────────────────────
  const handleVerify = async (action: "confirmed" | "rejected" | "under_review") => {
    if (!payment) return;
    setSubmitting(true);
    try {
      await updatePaymentStatus(payment.id, action, notes.trim() || undefined);
      onStatusChange();
      loadAuditLog();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleSaveNotes = async () => {
    if (!payment) return;
    setSubmitting(true);
    // admin_notes always exists; verification_notes only post-migration
    const patch: Record<string, any> = { admin_notes: notes.trim() || null };
    // Try adding new column; ignore error if column missing
    const { error } = await (supabase as any)
      .from("payments")
      .update({ ...patch, verification_notes: notes.trim() || null })
      .eq("id", payment.id);

    if (error) {
      // Fall back to legacy column only
      await (supabase as any).from("payments").update(patch).eq("id", payment.id);
    }

    toast({ title: "Notes saved" });
    loadAuditLog();
    setSubmitting(false);
  };

  if (!payment) return null;

  const isLocked   = ["confirmed", "rejected"].includes(payment.verification_status);
  const verifiedAt = payment.verified_at
    ? format(new Date(payment.verified_at), "d MMM yyyy, h:mm a")
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            onClick={e => e.stopPropagation()}
            className="bg-background rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">Payment Review</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    #{payment.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={payment.verification_status} />
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

              {/* ── Left column ── */}
              <div className="lg:w-[340px] lg:flex-shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border">
                <div className="p-5 space-y-5">

                  {/* Client */}
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />Client
                    </h3>
                    <p className="font-medium text-foreground">{userName || "—"}</p>
                    <p className="text-sm text-muted-foreground">{userEmail || "—"}</p>
                  </section>

                  {/* Property */}
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />Property
                    </h3>
                    <p className="font-medium text-foreground">{propertyTitle || `#${payment.property_id}`}</p>
                  </section>

                  {/* Payment details */}
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />Payment Details
                    </h3>
                    <div className="space-y-2">
                      {[
                        ["Amount",    `$${payment.amount?.toLocaleString()}`],
                        ["Date",      format(new Date(payment.payment_date), "d MMM yyyy")],
                        ["Method",    (payment.payment_method || "Bank Transfer").replace(/_/g, " ")],
                        ["Submitted", format(new Date(payment.created_at), "d MMM yyyy")],
                        ...(verifiedAt ? [["Verified", verifiedAt]] : []),
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground text-right max-w-[180px]">{val}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Verification */}
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />Verification
                    </h3>

                    {isLocked && (
                      <div className={`rounded-xl p-3 mb-3 text-sm ${
                        payment.verification_status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-red-500/10 text-red-700"
                      }`}>
                        <p className="font-medium">
                          {payment.verification_status === "confirmed" ? "✓ Confirmed" : "✗ Rejected"}
                        </p>
                        {verifiedAt && <p className="text-xs mt-0.5 opacity-80">{verifiedAt}</p>}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs">Verification Notes</Label>
                      <Textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Add notes about this payment…"
                        rows={3}
                        className="text-sm resize-none"
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-2 mt-3">
                      {!isLocked && (
                        <Button
                          variant="outline" size="sm"
                          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleVerify("under_review")}
                          disabled={submitting || payment.verification_status === "under_review"}
                        >
                          {submitting
                            ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                          Mark Under Review
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm"
                          onClick={() => handleVerify("confirmed")}
                          disabled={submitting || payment.verification_status === "confirmed"}
                        >
                          {submitting
                            ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                          Confirm
                        </Button>
                        <Button
                          variant="destructive" className="flex-1" size="sm"
                          onClick={() => handleVerify("rejected")}
                          disabled={submitting || payment.verification_status === "rejected"}
                        >
                          {submitting
                            ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5 mr-1" />}
                          Reject
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground"
                        onClick={handleSaveNotes} disabled={submitting}>
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />Save Notes Only
                      </Button>
                    </div>
                  </section>

                  {/* Audit log */}
                  <section>
                    <button
                      onClick={() => setShowAudit(!showAudit)}
                      className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground font-medium hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Activity ({auditLog.length})
                      </span>
                      {showAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <AnimatePresence>
                      {showAudit && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          {loadingAudit ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : auditLog.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-3 text-center">
                              No activity recorded yet.
                            </p>
                          ) : (
                            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                              {auditLog.map(entry => (
                                <div key={entry.id} className="flex gap-2.5 text-xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground">
                                      {ACTION_LABELS[entry.action] || entry.action}
                                    </p>
                                    <p className="text-muted-foreground truncate">
                                      {entry.performed_by_email || "System"}
                                    </p>
                                    {entry.notes && (
                                      <p className="text-muted-foreground italic mt-0.5 line-clamp-2">
                                        "{entry.notes}"
                                      </p>
                                    )}
                                    <p className="text-muted-foreground/60 mt-0.5">
                                      {format(new Date(entry.created_at), "d MMM, h:mm a")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                </div>
              </div>

              {/* ── Right column: document viewer ── */}
              <div className="flex-1 min-h-0 p-5 flex flex-col">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />Payment Proof Document
                </h3>
                <div className="flex-1 min-h-0">
                  {loadingDoc ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <DocumentViewer
                      url={docUrl || ""}
                      fileName={`payment-${payment.id.slice(0, 8)}`}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentDetailModal;