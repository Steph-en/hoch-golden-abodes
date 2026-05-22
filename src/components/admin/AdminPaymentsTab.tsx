import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, DollarSign, CheckCircle2, XCircle, Clock, Eye,
  Loader2, CreditCard, Filter, X, Download, RefreshCw,
  TrendingUp, AlertTriangle, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import PaymentDetailModal from "./PaymentDetailModal";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface EnrichedPayment extends Payment {
  userName: string;
  userEmail: string;
  propertyTitle: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const V_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending:      { label: "Pending",      color: "bg-amber-500/10 text-amber-600",     icon: Clock },
  under_review: { label: "Under Review", color: "bg-blue-500/10 text-blue-600",       icon: Eye },
  confirmed:    { label: "Confirmed",    color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  rejected:     { label: "Rejected",     color: "bg-red-500/10 text-red-600",         icon: XCircle },
};

// Derive a display status from the legacy `status` field when new columns are absent
const deriveVerificationStatus = (p: any): string => {
  if (p.verification_status) return p.verification_status;
  if (p.status === "Confirmed") return "confirmed";
  if (p.status === "Rejected")  return "rejected";
  return "pending";
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = V_STATUS[status] || V_STATUS.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

// ─── Summary card ─────────────────────────────────────────────────────────────

const SummaryCard = ({
  label, value, sub, icon: Icon,
}: { label: string; value: string | number; sub?: string; icon: any }) => (
  <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
    <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-xl font-display font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  allUsers: any[];
  dbProperties: any[];
}

const AdminPaymentsTab = ({ allUsers, dbProperties }: Props) => {
  const { toast } = useToast();

  const [payments, setPayments]       = useState<EnrichedPayment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<EnrichedPayment | null>(null);

  // ─── Data fetch ────────────────────────────────────────────────────────────

  const fetchPayments = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);

    const { data, error } = await (supabase as any)
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load payments", description: error.message, variant: "destructive" });
    } else {
      const enriched: EnrichedPayment[] = (data || []).map((p: any) => {
        const user = allUsers.find((u: any) => u.user_id === p.user_id);
        const prop = dbProperties.find((pr: any) => pr.id === p.property_id);
        return {
          ...p,
          verification_status: deriveVerificationStatus(p),
          userName:      user?.display_name || user?.email?.split("@")[0] || "Unknown",
          userEmail:     user?.email || "",
          propertyTitle: prop?.title || `Property #${p.property_id}`,
        };
      });
      setPayments(enriched);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchPayments(); }, [allUsers, dbProperties]);

  // Realtime refresh
  useEffect(() => {
    const channel = supabase
      .channel("admin-payments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" },
        () => fetchPayments(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [allUsers, dbProperties]);

  // ─── Shared update (migration-resilient) ──────────────────────────────────
  // Tries the full update (new columns) first.
  // On 400, falls back to legacy `status` + `admin_notes` only.

  const updatePaymentStatus = async (
    paymentId: string,
    action: "confirmed" | "rejected" | "under_review",
    notes?: string,
  ) => {
    const now = new Date().toISOString();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    // Fields that always exist (original schema)
    const legacyPatch: Record<string, any> = {
      status: action === "confirmed" ? "Confirmed"
             : action === "rejected"  ? "Rejected"
             : "Pending",
      admin_notes: notes || null,
    };

    // Fields added by the migration
    const extendedPatch: Record<string, any> = {
      verification_status: action,
      verification_notes:  notes || null,
    };
    if (action !== "under_review") {
      extendedPatch.verified_by  = userId;
      extendedPatch.verified_at  = now;
    }

    // Attempt full update (post-migration)
    const { error } = await (supabase as any)
      .from("payments")
      .update({ ...legacyPatch, ...extendedPatch })
      .eq("id", paymentId);

    if (error) {
      // 400 → new columns likely missing; fall back to legacy-only
      const { error: legacyErr } = await (supabase as any)
        .from("payments")
        .update(legacyPatch)
        .eq("id", paymentId);

      if (legacyErr) throw new Error(legacyErr.message);

      toast({
        title: action === "confirmed" ? "Payment confirmed"
             : action === "rejected"  ? "Payment rejected"
             : "Marked for review",
        description: "Apply the payment migration SQL to unlock the full verification workflow.",
      });
      return;
    }

    toast({
      title: action === "confirmed" ? "Payment confirmed"
           : action === "rejected"  ? "Payment rejected"
           : "Marked for review",
    });
  };

  // ─── Quick actions from table row ─────────────────────────────────────────

  const quickVerify = async (
    paymentId: string,
    action: "confirmed" | "rejected",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      await updatePaymentStatus(paymentId, action);
      fetchPayments(true);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  // ─── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter(p => {
      if (statusFilter !== "all" && p.verification_status !== statusFilter) return false;
      if (propertyFilter !== "all" && String(p.property_id) !== propertyFilter) return false;
      if (dateFrom && p.payment_date < dateFrom) return false;
      if (dateTo   && p.payment_date > dateTo)   return false;
      if (q) return (
        p.userName.toLowerCase().includes(q) ||
        p.userEmail.toLowerCase().includes(q) ||
        p.propertyTitle.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
      return true;
    });
  }, [payments, search, statusFilter, propertyFilter, dateFrom, dateTo]);

  // ─── Summary stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const confirmed = payments.filter(p => p.verification_status === "confirmed");
    const pending   = payments.filter(p => p.verification_status === "pending");
    const review    = payments.filter(p => p.verification_status === "under_review");
    const revenue   = confirmed.reduce((s, p) => s + Number(p.amount), 0);
    return { total: payments.length, confirmed: confirmed.length, pending: pending.length, review: review.length, revenue };
  }, [payments]);

  // ─── CSV export ────────────────────────────────────────────────────────────

  const exportCsv = () => {
    if (!filtered.length) { toast({ title: "Nothing to export" }); return; }
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["ID","User","Email","Property","Amount","Date","Method","Status","Verified At","Notes"];
    const rows = filtered.map(p => [
      p.id, p.userName, p.userEmail, p.propertyTitle,
      p.amount, p.payment_date, p.payment_method || "bank_transfer",
      p.verification_status, p.verified_at || "", p.verification_notes || "",
    ].map(esc).join(","));
    const csv  = [headers.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = statusFilter !== "all" || propertyFilter !== "all" || dateFrom || dateTo || search;
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setPropertyFilter("all"); setDateFrom(""); setDateTo(""); };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard label="Total Payments"  value={stats.total}                           icon={CreditCard} />
        <SummaryCard label="Pending Review"  value={stats.pending}                         icon={Clock} />
        <SummaryCard label="Under Review"    value={stats.review}                          icon={Eye} />
        <SummaryCard label="Confirmed"       value={stats.confirmed}                       icon={CheckCircle2} />
        <SummaryCard label="Total Revenue"   value={`$${stats.revenue.toLocaleString()}`} icon={TrendingUp} sub="from confirmed payments" />
      </div>

      {/* Pending alert */}
      {stats.pending > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-200 rounded-xl text-amber-700"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            <strong>{stats.pending} payment{stats.pending !== 1 ? "s" : ""}</strong> awaiting verification.
          </p>
          <Button variant="outline" size="sm"
            className="ml-auto border-amber-300 text-amber-700 hover:bg-amber-50 flex-shrink-0"
            onClick={() => setStatusFilter("pending")}>
            View pending
          </Button>
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search user, property, ID…" className="pl-9" />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(V_STATUS).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All properties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {dbProperties.map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant={showFilters ? "default" : "outline"} size="sm"
          onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-3.5 h-3.5 mr-1.5" />Date range
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" />Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {filtered.length} of {payments.length}
          </p>
          <Button variant="outline" size="sm" onClick={() => fetchPayments(true)} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
          </Button>
        </div>
      </div>

      {/* Date range */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Payment date:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="w-40" />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              Clear dates
            </Button>
          )}
        </motion.div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground text-sm">Loading payments…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No payments found</h3>
          <p className="text-muted-foreground text-sm">
            {hasFilters ? "Try adjusting your filters." : "No payments have been submitted yet."}
          </p>
          {hasFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment, i) => {
                const hasDoc  = !!(payment.receipt_url || payment.receipt_path);
                const isPending = payment.verification_status === "pending";
                const isReview  = payment.verification_status === "under_review";
                const canAct    = isPending || isReview;

                return (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                      isPending ? "bg-amber-500/5" : ""
                    }`}
                    onClick={() => setSelectedPayment(payment)}
                  >
                    {/* Client */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                          {(payment.userName[0] || "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                            {payment.userName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {payment.userEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <p className="text-sm text-foreground truncate max-w-[140px]">{payment.propertyTitle}</p>
                    </TableCell>

                    <TableCell>
                      <p className="font-semibold text-foreground">${Number(payment.amount).toLocaleString()}</p>
                    </TableCell>

                    <TableCell>
                      <p className="text-sm text-foreground">{format(new Date(payment.payment_date), "d MMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">Submitted {format(new Date(payment.created_at), "d MMM")}</p>
                    </TableCell>

                    <TableCell>
                      {hasDoc ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                          <FileText className="w-3.5 h-3.5" />Attached
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={payment.verification_status} />
                      {payment.verified_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(payment.verified_at), "d MMM")}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1"
                          onClick={e => { e.stopPropagation(); setSelectedPayment(payment); }}>
                          <Eye className="w-3 h-3" />Review
                        </Button>
                        {canAct && (
                          <>
                            <Button size="sm" className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={e => quickVerify(payment.id, "confirmed", e)}>
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 px-2.5 text-xs"
                              onClick={e => quickVerify(payment.id, "rejected", e)}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {!canAct && (
                          <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-muted-foreground"
                            onClick={e => { e.stopPropagation(); setSelectedPayment(payment); }}>
                            <FileText className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail modal */}
      <PaymentDetailModal
        payment={selectedPayment}
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        userName={selectedPayment?.userName || ""}
        userEmail={selectedPayment?.userEmail || ""}
        propertyTitle={selectedPayment?.propertyTitle || ""}
        onStatusChange={() => fetchPayments(true)}
        updatePaymentStatus={updatePaymentStatus}
      />
    </div>
  );
};

export default AdminPaymentsTab;