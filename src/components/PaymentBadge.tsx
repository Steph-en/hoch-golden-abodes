type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded" | "failed" | string;

const STYLES: Record<string, string> = {
  unpaid: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-600",
  paid: "bg-emerald-500/10 text-emerald-600",
  refunded: "bg-blue-500/10 text-blue-600",
  failed: "bg-red-500/10 text-red-600",
};

export const PaymentBadge = ({ status, className = "" }: { status?: PaymentStatus; className?: string }) => {
  const s = (status || "unpaid").toLowerCase();
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${STYLES[s] || STYLES.unpaid} ${className}`}>
      {s}
    </span>
  );
};

export default PaymentBadge;
