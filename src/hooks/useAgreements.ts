import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export type AgreementStatus =
  | "pending_signature"
  | "uploaded"
  | "under_review"
  | "verified"
  | "rejected"
  | "archived";

export interface Agreement {
  id: string;
  user_id: string;
  property_id: number;
  document_url: string | null;
  original_document_url: string | null;
  original_document_storage_path: string | null;
  signed_document_url: string | null;
  signed_document_storage_path: string | null;
  signed_document_file_name: string | null;
  signed_document_file_type: string | null;
  signature_url: string | null;
  signature_type: string | null;
  approval_status: string;
  agreement_status: AgreementStatus;
  admin_notes: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  signed_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgreementAuditLog {
  id: string;
  agreement_id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

// Derives display status from legacy fields if new column missing
export const resolveStatus = (agr: any): AgreementStatus => {
  if (agr.agreement_status && agr.agreement_status !== "pending_signature") {
    return agr.agreement_status as AgreementStatus;
  }
  if (agr.approval_status === "Approved") return "verified";
  if (agr.approval_status === "Rejected") return "rejected";
  if (agr.signed_document_url) return "uploaded";
  return "pending_signature";
};

// ─── User hook ─────────────────────────────────────────────────────────────

export const useUserAgreements = (userId: string | undefined) => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) { setAgreements([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("agreements")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setAgreements((data || []).map((a: any) => ({ ...a, agreement_status: resolveStatus(a) })));
    setLoading(false);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`user-agreements-${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "agreements",
        filter: `user_id=eq.${userId}`,
      }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, refetch]);

  return { agreements, loading, refetch };
};

// ─── Admin hook ────────────────────────────────────────────────────────────

export const useAdminAgreements = () => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("agreements")
      .select("*")
      .order("created_at", { ascending: false });
    setAgreements((data || []).map((a: any) => ({ ...a, agreement_status: resolveStatus(a) })));
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-agreements-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "agreements" }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  return { agreements, loading, refetch };
};

// ─── Audit log hook ─────────────────────────────────────────────────────────

export const useAgreementAuditLog = (agreementId: string | undefined) => {
  const [logs, setLogs] = useState<AgreementAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!agreementId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("agreement_audit_logs")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("created_at", { ascending: false });
      // Table may not exist yet (migration pending) — degrade gracefully
      if (error) {
        console.warn("agreement_audit_logs (non-fatal):", error.message);
        setLogs([]);
      } else {
        setLogs(data || []);
      }
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [agreementId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { logs, loading, refetch };
};

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Upload signed document to agreements storage bucket */
export const uploadSignedDocument = async (
  agreementId: string,
  userId: string,
  file: File
): Promise<{ url: string; path: string }> => {
  const ext = file.name.split(".").pop() || "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${agreementId}/signed_${Date.now()}_${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from("agreements")
    .upload(path, file, { upsert: false });

  if (uploadErr) throw new Error(uploadErr.message);

  const { data: signed, error: signedErr } = await supabase.storage
    .from("agreements")
    .createSignedUrl(path, 3600);

  if (signedErr) throw new Error(signedErr.message);

  return { url: (signed as any).signedUrl, path };
};

/** Refresh a signed URL for a stored agreement file */
export const getAgreementSignedUrl = async (path: string): Promise<string | null> => {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("agreements")
    .createSignedUrl(path, 3600);
  return (data as any)?.signedUrl || null;
};

/** Update agreement after user uploads signed document */
export const submitSignedDocument = async (params: {
  agreementId: string;
  userId: string;
  file: File;
}): Promise<void> => {
  const { agreementId, userId, file } = params;
  const { url, path } = await uploadSignedDocument(agreementId, userId, file);

  const { error } = await (supabase as any)
    .from("agreements")
    .update({
      signed_document_url: url,
      signed_document_storage_path: path,
      signed_document_file_name: file.name,
      signed_document_file_type: file.type,
      signed_uploaded_at: new Date().toISOString(),
      agreement_status: "uploaded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreementId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  await logAgreementAction(agreementId, "signed_document_uploaded", {
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  });

  // Notify super_admins via email (best-effort)
  await sendAgreementEmail({
    type: "agreement_uploaded",
    agreementId,
  });
};

/** Admin: update agreement status */
export const updateAgreementStatus = async (params: {
  agreementId: string;
  status: AgreementStatus;
  notes?: string;
  verifiedBy?: string;
}): Promise<void> => {
  const { agreementId, status, notes, verifiedBy } = params;

  const patch: Record<string, any> = {
    agreement_status: status,
    approval_status: status === "verified" ? "Approved"
      : status === "rejected" ? "Rejected"
      : "Pending",
    updated_at: new Date().toISOString(),
  };

  if (notes !== undefined) patch.verification_notes = notes;
  if (notes !== undefined) patch.admin_notes = notes;

  if (status === "verified" || status === "rejected") {
    patch.verified_at = new Date().toISOString();
    if (verifiedBy) patch.verified_by = verifiedBy;
  }

  const { error } = await (supabase as any)
    .from("agreements")
    .update(patch)
    .eq("id", agreementId);

  if (error) throw new Error(error.message);

  await logAgreementAction(agreementId, `status_${status}`, { notes, status });

  // Fetch user_id + property_id so we can address the email
  const { data: agr } = await (supabase as any)
    .from("agreements")
    .select("user_id, property_id")
    .eq("id", agreementId)
    .single();

  if (agr?.user_id) {
    const emailTypeMap: Record<string, string> = {
      under_review: "agreement_under_review",
      verified:     "agreement_verified",
      rejected:     "agreement_rejected",
      archived:     "agreement_archived",
    };
    const emailType = emailTypeMap[status];
    if (emailType) {
      await sendAgreementEmail({
        type: emailType,
        userId: agr.user_id,
        agreementId,
        verificationNotes: notes,
      });
    }
  }
};

// ─── Email helper ───────────────────────────────────────────────────────────

/**
 * Invoke the send-agreement-email edge function.
 * Best-effort: never throws so it never blocks the main flow.
 */
export const sendAgreementEmail = async (params: {
  type: string;
  userId?: string;
  to?: string;
  recipientName?: string;
  propertyTitle?: string;
  verificationNotes?: string;
  agreementId?: string;
}): Promise<void> => {
  try {
    await supabase.functions.invoke("send-agreement-email", { body: params });
  } catch (e) {
    console.warn("send-agreement-email non-fatal error:", e);
  }
};

/** Log an agreement action to the audit trail (best-effort, never throws) */
export const logAgreementAction = async (
  agreementId: string,
  action: string,
  metadata: Record<string, any> = {}
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase as any).from("agreement_audit_logs").insert({
      agreement_id: agreementId,
      user_id: user.id,
      action,
      metadata,
    });
    // Silently ignore — table may not exist until migration is applied
    if (error) console.warn("audit_log (non-fatal):", error.message);
  } catch (e) {
    console.warn("audit_log (non-fatal):", e);
  }
};

/** Admin: create a new agreement for a user */
export const createAgreement = async (params: {
  userId: string;
  propertyId: number;
  documentFile?: File | null;
}): Promise<string> => {
  const { userId, propertyId, documentFile } = params;

  // Confirm the caller is authenticated (they must be a super_admin)
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser) throw new Error("Not authenticated");

  let documentUrl: string | null = null;
  let originalStoragePath: string | null = null;

  if (documentFile) {
    const safeName = documentFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Path structure: {adminId}/originals/{targetUserId}/{timestamp}_{name}
    //   • First segment = admin's uid  → satisfies existing user INSERT policy
    //   • Third segment = target userId → allows new SELECT policy for the user
    const path = `${adminUser.id}/originals/${userId}/${Date.now()}_${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from("agreements")
      .upload(path, documentFile);
    if (uploadErr) throw new Error(uploadErr.message);

    originalStoragePath = path;

    // Private bucket — always use signed URLs, never getPublicUrl
    const { data: signed } = await supabase.storage
      .from("agreements")
      .createSignedUrl(path, 3600); // 1-hour URL for immediate use; refreshed on demand
    documentUrl = (signed as any)?.signedUrl ?? null;
  }

  const { data, error } = await (supabase as any)
    .from("agreements")
    .insert({
      user_id: userId,
      property_id: propertyId,
      document_url: documentUrl,
      original_document_url: documentUrl,
      original_document_storage_path: originalStoragePath,
      approval_status: "Pending",
      agreement_status: "pending_signature",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logAgreementAction(data.id, "agreement_created", { property_id: propertyId });

  return data.id;
};