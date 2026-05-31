import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, CheckCircle2, XCircle, Eye, FileText,
  User, Building2, Calendar, MessageSquare, Loader2,
  Upload, Shield, ChevronDown, ChevronUp, AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AgreementStatusBadge from "./AgreementStatusBadge";
import AgreementDocumentViewer from "./AgreementDocumentViewer";
import AgreementUploadPanel from "./AgreementUploadPanel";
import AgreementTimeline from "./AgreementTimeline";
import {
  type Agreement,
  type AgreementStatus,
  type AgreementAuditLog,
  useAgreementAuditLog,
  submitSignedDocument,
  updateAgreementStatus,
  logAgreementAction,
  getAgreementSignedUrl,
} from "@/hooks/useAgreements";

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  agreement: Agreement | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
  isSuperAdmin?: boolean;
  /** Optional enriched data from parent */
  propertyTitle?: string;
  propertyImage?: string;
  userName?: string;
  userEmail?: string;
}

// ─── Info row ───────────────────────────────────────────────────────────────

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex justify-between items-start text-sm gap-2">
    <span className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
    <span className="font-medium text-foreground text-right max-w-[200px] truncate">{value}</span>
  </div>
);

// ─── Status action button set ────────────────────────────────────────────────

const canUpload = (status: AgreementStatus) =>
  ["pending_signature", "rejected"].includes(status);

const canVerify = (status: AgreementStatus) =>
  ["uploaded", "under_review"].includes(status);

// ─── Main component ──────────────────────────────────────────────────────────

const AgreementDetailsModal = ({
  agreement,
  open,
  onClose,
  onStatusChange,
  isSuperAdmin = false,
  propertyTitle,
  propertyImage,
  userName,
  userEmail,
}: Props) => {
  const { toast } = useToast();
  const { logs, refetch: refetchLogs } = useAgreementAuditLog(agreement?.id);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [resolvedOriginalUrl, setResolvedOriginalUrl] = useState<string | null>(null);
  const [docTab, setDocTab] = useState<"original" | "signed">("original");

  // Reset state when agreement changes
  useEffect(() => {
    if (!agreement || !open) return;
    setNotes(agreement.verification_notes ?? agreement.admin_notes ?? "");
    setUploadFile(null);
    setShowTimeline(false);
    setDocTab(agreement.signed_document_url ? "signed" : "original");

    // Resolve fresh signed URL for signed document
    if (agreement.signed_document_storage_path) {
      getAgreementSignedUrl(agreement.signed_document_storage_path).then(setSignedUrl);
    } else {
      setSignedUrl(agreement.signed_document_url);
    }

    // Resolve fresh signed URL for original document (stored URL may be expired)
    if (agreement.original_document_storage_path) {
      getAgreementSignedUrl(agreement.original_document_storage_path).then(setResolvedOriginalUrl);
    } else {
      setResolvedOriginalUrl(agreement.original_document_url ?? agreement.document_url ?? null);
    }

    // Log document view
    logAgreementAction(agreement.id, "agreement_viewed", {
      role: isSuperAdmin ? "admin" : "user",
    });

    refetchLogs();
  }, [agreement?.id, open]);

  // ── Upload signed document ─────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!agreement || !uploadFile) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    try {
      await submitSignedDocument({
        agreementId: agreement.id,
        userId: user.id,
        file: uploadFile,
      });
      toast({ title: "Signed agreement uploaded", description: "An admin will review it shortly." });
      setUploadFile(null);
      onStatusChange?.();
      refetchLogs();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Admin status actions ───────────────────────────────────────────────────

  const handleStatusAction = async (status: AgreementStatus) => {
    if (!agreement) return;
    const { data: { user } } = await supabase.auth.getUser();
    setSubmitting(true);
    try {
      await updateAgreementStatus({
        agreementId: agreement.id,
        status,
        notes: notes.trim() || undefined,
        verifiedBy: user?.id,
      });
      toast({
        title: status === "verified"   ? "Agreement verified ✓"
             : status === "rejected"   ? "Agreement rejected"
             : status === "archived"   ? "Agreement archived"
             : "Marked for review",
      });
      onStatusChange?.();
      refetchLogs();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (url: string | null, name?: string | null) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = name ?? "agreement";
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
    if (agreement) logAgreementAction(agreement.id, "agreement_downloaded", { type: name });
  };

  if (!agreement) return null;

  const status = agreement.agreement_status;
  // Use the freshly-resolved signed URL; falls back to whatever is stored for older rows
  const originalUrl = resolvedOriginalUrl ?? agreement.original_document_url ?? agreement.document_url;
  const signedDocUrl = signedUrl ?? agreement.signed_document_url;
  const hasOriginal = !!originalUrl;
  const hasSigned   = !!signedDocUrl;
  const isLocked    = ["verified", "rejected", "archived"].includes(status);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-border overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Agreement Details
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    #{agreement.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AgreementStatusBadge status={status} />
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

              {/* Left: metadata + actions */}
              <div className="lg:w-[300px] lg:flex-shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border">
                <div className="p-5 space-y-5">

                  {/* Property */}
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Property
                    </h3>
                    {propertyImage && (
                      <img
                        src={propertyImage}
                        alt={propertyTitle}
                        className="w-full h-24 object-cover rounded-lg mb-2 border border-border"
                      />
                    )}
                    <p className="font-medium text-foreground text-sm">
                      {propertyTitle || `Property #${agreement.property_id}`}
                    </p>
                  </section>

                  {/* User (admin only) */}
                  {isSuperAdmin && (userName || userEmail) && (
                    <section>
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Client
                      </h3>
                      <p className="font-medium text-foreground text-sm">{userName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{userEmail ?? "—"}</p>
                    </section>
                  )}

                  {/* Dates */}
                  <section className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Dates
                    </h3>
                    <InfoRow
                      icon={Calendar}
                      label="Created"
                      value={format(new Date(agreement.created_at), "d MMM yyyy")}
                    />
                    {agreement.signed_uploaded_at && (
                      <InfoRow
                        icon={Upload}
                        label="Uploaded"
                        value={format(new Date(agreement.signed_uploaded_at), "d MMM yyyy, h:mm a")}
                      />
                    )}
                    {agreement.verified_at && (
                      <InfoRow
                        icon={CheckCircle2}
                        label="Verified"
                        value={format(new Date(agreement.verified_at), "d MMM yyyy, h:mm a")}
                      />
                    )}
                  </section>

                  {/* Admin verification panel */}
                  {isSuperAdmin && (
                    <section>
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> Verification
                      </h3>

                      {isLocked && (
                        <div className={`rounded-xl p-3 mb-3 text-sm ${
                          status === "verified"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : status === "rejected"
                            ? "bg-red-500/10 text-red-700"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <p className="font-medium capitalize">{status}</p>
                          {agreement.verified_at && (
                            <p className="text-xs mt-0.5 opacity-80">
                              {format(new Date(agreement.verified_at), "d MMM yyyy, h:mm a")}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add verification notes…"
                          rows={3}
                          className="text-sm resize-none"
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-2 mt-3">
                        {/* Mark under review */}
                        {!isLocked && status !== "under_review" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                            onClick={() => handleStatusAction("under_review")}
                            disabled={submitting || !hasSigned}
                          >
                            {submitting
                              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                            Mark Under Review
                          </Button>
                        )}

                        {/* Verify / Reject */}
                        {canVerify(status) && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleStatusAction("verified")}
                              disabled={submitting}
                            >
                              {submitting
                                ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                              Verify
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleStatusAction("rejected")}
                              disabled={submitting}
                            >
                              {submitting
                                ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                : <XCircle className="w-3.5 h-3.5 mr-1" />}
                              Reject
                            </Button>
                          </div>
                        )}

                        {/* Archive */}
                        {!isLocked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() => handleStatusAction("archived")}
                            disabled={submitting}
                          >
                            Archive Agreement
                          </Button>
                        )}

                        {/* Save notes only */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground"
                          onClick={async () => {
                            if (!agreement) return;
                            setSubmitting(true);
                            try {
                              await (supabase as any)
                                .from("agreements")
                                .update({
                                  admin_notes: notes.trim() || null,
                                  verification_notes: notes.trim() || null,
                                  updated_at: new Date().toISOString(),
                                })
                                .eq("id", agreement.id);
                              toast({ title: "Notes saved" });
                              onStatusChange?.();
                            } catch { /**/ } finally { setSubmitting(false); }
                          }}
                          disabled={submitting}
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Save Notes Only
                        </Button>
                      </div>
                    </section>
                  )}

                  {/* Timeline / Audit log */}
                  <section>
                    <button
                      onClick={() => setShowTimeline(!showTimeline)}
                      className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground font-medium hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        History ({logs.length})
                      </span>
                      {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <AnimatePresence>
                      {showTimeline && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-3"
                        >
                          <AgreementTimeline
                            logs={logs}
                            createdAt={agreement.created_at}
                            signedUploadedAt={agreement.signed_uploaded_at}
                            verifiedAt={agreement.verified_at}
                          />
                          {logs.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-3">
                              No activity recorded yet.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                </div>
              </div>

              {/* Right: document viewer */}
              <div className="flex-1 min-h-0 p-5 flex flex-col gap-4 overflow-y-auto">

                {/* Document tabs */}
                <Tabs value={docTab} onValueChange={(v) => setDocTab(v as any)}>
                  <div className="flex items-center justify-between mb-3">
                    <TabsList className="h-9">
                      <TabsTrigger value="original" className="text-xs gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Original
                      </TabsTrigger>
                      <TabsTrigger value="signed" className="text-xs gap-1.5" disabled={!hasSigned}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Signed{hasSigned ? "" : " (none)"}
                      </TabsTrigger>
                    </TabsList>

                    {/* Download button for active tab */}
                    {docTab === "original" && hasOriginal && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => handleDownload(originalUrl, "agreement-original")}
                      >
                        <Download className="w-3.5 h-3.5" /> Download Original
                      </Button>
                    )}
                    {docTab === "signed" && hasSigned && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => handleDownload(signedDocUrl, agreement.signed_document_file_name ?? "signed-agreement")}
                      >
                        <Download className="w-3.5 h-3.5" /> Download Signed
                      </Button>
                    )}
                  </div>

                  <TabsContent value="original" className="mt-0">
                    <AgreementDocumentViewer
                      url={originalUrl}
                      fileName="Original Agreement"
                      emptyLabel="No original document attached yet"
                      minHeight={360}
                    />
                  </TabsContent>

                  <TabsContent value="signed" className="mt-0">
                    <AgreementDocumentViewer
                      url={signedDocUrl}
                      fileName={agreement.signed_document_file_name ?? "Signed Agreement"}
                      fileType={agreement.signed_document_file_type ?? undefined}
                      emptyLabel="Signed agreement not yet uploaded"
                      minHeight={360}
                    />
                  </TabsContent>
                </Tabs>

                {/* Upload section — shown for users who can still upload */}
                {!isSuperAdmin && canUpload(status) && (
                  <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">
                        Upload Your Signed Agreement
                      </h4>
                    </div>

                    {status === "rejected" && (
                      <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          Your previous submission was rejected.
                          {agreement.verification_notes && ` Reason: ${agreement.verification_notes}`} Please upload a corrected version.
                        </span>
                      </div>
                    )}

                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Download the original agreement above</li>
                      <li>Print, sign, and scan or photograph it</li>
                      <li>Upload the signed copy below</li>
                    </ol>

                    <AgreementUploadPanel
                      onFileSelect={setUploadFile}
                      selectedFile={uploadFile}
                      disabled={uploading}
                    />

                    <Button
                      className="w-full"
                      onClick={handleUpload}
                      disabled={!uploadFile || uploading}
                    >
                      {uploading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
                        : <><Upload className="w-4 h-4 mr-2" /> Submit Signed Agreement</>}
                    </Button>
                  </div>
                )}

                {/* Admin upload of signed document on behalf */}
                {isSuperAdmin && canUpload(status) && (
                  <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium text-foreground">
                        Upload Signed Document (Admin)
                      </h4>
                    </div>
                    <AgreementUploadPanel
                      onFileSelect={setUploadFile}
                      selectedFile={uploadFile}
                      disabled={uploading}
                      label="Upload a signed agreement on behalf of the user"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleUpload}
                      disabled={!uploadFile || uploading}
                    >
                      {uploading
                        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        : <Upload className="w-4 h-4 mr-2" />}
                      Submit on Behalf of User
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgreementDetailsModal;