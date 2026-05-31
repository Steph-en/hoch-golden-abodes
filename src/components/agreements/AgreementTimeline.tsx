import { format } from "date-fns";
import {
  FileSignature, Upload, Eye, CheckCircle2, XCircle,
  Archive, Clock, PenTool, Download, FilePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgreementAuditLog } from "@/hooks/useAgreements";

const ACTION_CONFIG: Record<string, {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}> = {
  agreement_created:         { label: "Agreement created",          icon: FilePlus,      color: "bg-primary/20 text-primary" },
  agreement_viewed:          { label: "Document viewed",            icon: Eye,           color: "bg-blue-500/20 text-blue-600" },
  agreement_downloaded:      { label: "Document downloaded",        icon: Download,      color: "bg-blue-500/20 text-blue-600" },
  signed_document_uploaded:  { label: "Signed document uploaded",   icon: Upload,        color: "bg-indigo-500/20 text-indigo-600" },
  status_pending_signature:  { label: "Awaiting signature",         icon: Clock,         color: "bg-amber-500/20 text-amber-600" },
  status_uploaded:           { label: "Document uploaded",          icon: Upload,        color: "bg-blue-500/20 text-blue-600" },
  status_under_review:       { label: "Marked under review",        icon: Eye,           color: "bg-purple-500/20 text-purple-600" },
  status_verified:           { label: "Agreement verified",         icon: CheckCircle2,  color: "bg-emerald-500/20 text-emerald-600" },
  status_rejected:           { label: "Agreement rejected",         icon: XCircle,       color: "bg-red-500/20 text-red-600" },
  status_archived:           { label: "Agreement archived",         icon: Archive,       color: "bg-muted text-muted-foreground" },
  agreement_version_created: { label: "New version created",        icon: FilePlus,      color: "bg-primary/20 text-primary" },
  agreement_signed:          { label: "Agreement signed",           icon: PenTool,       color: "bg-emerald-500/20 text-emerald-600" },
};

const FALLBACK = { label: "Action recorded", icon: Clock, color: "bg-muted text-muted-foreground" };

interface SyntheticEntry {
  id: string;
  action: string;
  created_at: string;
  metadata?: Record<string, any> | null;
  note?: string;
}

interface Props {
  logs: AgreementAuditLog[];
  createdAt: string;
  signedUploadedAt?: string | null;
  verifiedAt?: string | null;
  className?: string;
}

const AgreementTimeline = ({
  logs,
  createdAt,
  signedUploadedAt,
  verifiedAt,
  className,
}: Props) => {
  // Merge DB logs with synthetic milestone entries
  const synthetic: SyntheticEntry[] = [
    { id: "__created", action: "agreement_created", created_at: createdAt },
    ...(signedUploadedAt
      ? [{ id: "__uploaded", action: "signed_document_uploaded", created_at: signedUploadedAt }]
      : []),
    ...(verifiedAt
      ? [{ id: "__verified", action: "status_verified", created_at: verifiedAt }]
      : []),
  ];

  // Merge + deduplicate by action proximity (same action within 5 s)
  const dbEntries: SyntheticEntry[] = logs.map((l) => ({
    id: l.id,
    action: l.action,
    created_at: l.created_at,
    metadata: l.metadata,
  }));

  const all = [...dbEntries, ...synthetic].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (all.length === 0) return null;

  return (
    <div className={cn("space-y-0", className)}>
      {all.map((entry, i) => {
        const cfg = ACTION_CONFIG[entry.action] ?? FALLBACK;
        const Icon = cfg.icon;
        const isLast = i === all.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Track */}
            <div className="flex flex-col items-center flex-shrink-0 w-6">
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0", cfg.color)}>
                <Icon className="w-3 h-3" />
              </div>
              {!isLast && <div className="flex-1 w-px bg-border mt-1 mb-0" />}
            </div>

            {/* Content */}
            <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
              <p className="text-sm font-medium text-foreground leading-none">
                {cfg.label}
              </p>
              {entry.metadata?.notes && (
                <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-2">
                  "{entry.metadata.notes}"
                </p>
              )}
              {entry.metadata?.file_name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.metadata.file_name}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                {format(new Date(entry.created_at), "d MMM yyyy, h:mm a")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AgreementTimeline;