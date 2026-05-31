import { Clock, Upload, Eye, CheckCircle2, XCircle, Archive, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusKey =
  | "pending_signature" | "uploaded" | "under_review"
  | "verified" | "rejected" | "archived"
  | "Pending" | "Approved" | "Rejected"; // legacy

interface StatusConfig {
  label: string;
  color: string;
  icon: React.FC<{ className?: string }>;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending_signature: {
    label: "Pending Signature",
    color: "bg-amber-500/10 text-amber-700 border-amber-200",
    icon: Clock,
  },
  uploaded: {
    label: "Uploaded",
    color: "bg-blue-500/10 text-blue-700 border-blue-200",
    icon: Upload,
  },
  under_review: {
    label: "Under Review",
    color: "bg-purple-500/10 text-purple-700 border-purple-200",
    icon: Eye,
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500/10 text-red-700 border-red-200",
    icon: XCircle,
  },
  archived: {
    label: "Archived",
    color: "bg-muted text-muted-foreground border-border",
    icon: Archive,
  },
  // Legacy approval_status fallbacks
  Pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-700 border-amber-200",
    icon: Clock,
  },
  Approved: {
    label: "Approved",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  Rejected: {
    label: "Rejected",
    color: "bg-red-500/10 text-red-700 border-red-200",
    icon: XCircle,
  },
};

interface Props {
  status: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const AgreementStatusBadge = ({ status, size = "md", className }: Props) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_signature;
  const Icon = cfg.icon;

  const sizeClasses = {
    xs: "px-2 py-0.5 text-[10px] gap-1",
    sm: "px-2.5 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
  }[size];

  const iconSize = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        sizeClasses,
        cfg.color,
        className
      )}
    >
      <Icon className={iconSize} />
      {cfg.label}
    </span>
  );
};

export default AgreementStatusBadge;