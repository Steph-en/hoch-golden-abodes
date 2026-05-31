import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, RefreshCw, Download, Eye, CheckCircle2,
  XCircle, Clock, Upload, FileText, Users, Filter, X,
  Loader2, AlertTriangle, Building2, ChevronDown, FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AgreementStatusBadge, { STATUS_CONFIG } from "@/components/agreements/AgreementStatusBadge";
import AgreementDetailsModal from "@/components/agreements/AgreementDetailsModal";
import {
  useAdminAgreements,
  updateAgreementStatus,
  createAgreement,
  type Agreement,
  type AgreementStatus,
} from "@/hooks/useAgreements";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnrichedAgreement extends Agreement {
  userName: string;
  userEmail: string;
  propertyTitle: string;
  propertyImage: string;
}

interface Props {
  allUsers: any[];
  dbProperties: any[];
}

// ─── Summary card ─────────────────────────────────────────────────────────────

const StatCard = ({
  label, value, icon: Icon, accent,
}: { label: string; value: number; icon: any; accent: string }) => (
  <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
    <div className={`p-2.5 rounded-xl flex-shrink-0 ${accent}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-xl font-display font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const AdminAgreementsTab = ({ allUsers, dbProperties }: Props) => {
  const { toast } = useToast();
  const { agreements, loading, refetch } = useAdminAgreements();

  // Selected agreement for detail modal
  const [selected, setSelected] = useState<EnrichedAgreement | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newPropertyId, setNewPropertyId] = useState("");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Enrich agreements ─────────────────────────────────────────────────────

  const enriched = useMemo<EnrichedAgreement[]>(() => {
    return agreements.map((agr) => {
      const user  = allUsers.find((u) => u.user_id === agr.user_id);
      const prop  = dbProperties.find((p) => p.id === agr.property_id);
      return {
        ...agr,
        userName:      user?.display_name ?? user?.email?.split("@")[0] ?? "Unknown",
        userEmail:     user?.email ?? "",
        propertyTitle: prop?.title ?? `Property #${agr.property_id}`,
        propertyImage: prop?.image_url ?? "",
      };
    });
  }, [agreements, allUsers, dbProperties]);

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((a) => {
      if (statusFilter !== "all" && a.agreement_status !== statusFilter) return false;
      if (propertyFilter !== "all" && String(a.property_id) !== propertyFilter) return false;
      if (q) {
        return (
          a.userName.toLowerCase().includes(q) ||
          a.userEmail.toLowerCase().includes(q) ||
          a.propertyTitle.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, search, statusFilter, propertyFilter]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:          enriched.length,
    pending:        enriched.filter((a) => a.agreement_status === "pending_signature").length,
    uploaded:       enriched.filter((a) => a.agreement_status === "uploaded").length,
    under_review:   enriched.filter((a) => a.agreement_status === "under_review").length,
    verified:       enriched.filter((a) => a.agreement_status === "verified").length,
    rejected:       enriched.filter((a) => a.agreement_status === "rejected").length,
  }), [enriched]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const quickAction = async (
    agr: EnrichedAgreement,
    status: AgreementStatus,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await updateAgreementStatus({ agreementId: agr.id, status, verifiedBy: user?.id });
      toast({ title: status === "verified" ? "Agreement verified ✓" : "Agreement rejected" });
      refetch();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newUserId || !newPropertyId) {
      toast({ title: "Please select a user and property", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createAgreement({
        userId: newUserId,
        propertyId: parseInt(newPropertyId),
        documentFile: newDocFile,
      });
      toast({ title: "Agreement created and sent to user" });
      setShowCreate(false);
      setNewUserId("");
      setNewPropertyId("");
      setNewDocFile(null);
      refetch();
    } catch (err: any) {
      toast({ title: "Failed to create agreement", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const exportCsv = () => {
    if (!filtered.length) return;
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["ID", "User", "Email", "Property", "Status", "Created", "Uploaded", "Verified"];
    const rows = filtered.map((a) => [
      a.id, a.userName, a.userEmail, a.propertyTitle, a.agreement_status,
      format(new Date(a.created_at), "yyyy-MM-dd"),
      a.signed_uploaded_at ? format(new Date(a.signed_uploaded_at), "yyyy-MM-dd") : "",
      a.verified_at ? format(new Date(a.verified_at), "yyyy-MM-dd") : "",
    ].map(esc).join(","));
    const csv  = [headers.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `agreements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = statusFilter !== "all" || propertyFilter !== "all" || search;
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setPropertyFilter("all"); };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total"        value={stats.total}        icon={FileSignature} accent="bg-primary/10 text-primary" />
        <StatCard label="Pending Sig." value={stats.pending}      icon={Clock}         accent="bg-amber-500/10 text-amber-600" />
        <StatCard label="Uploaded"     value={stats.uploaded}     icon={Upload}        accent="bg-blue-500/10 text-blue-600" />
        <StatCard label="Under Review" value={stats.under_review} icon={Eye}           accent="bg-purple-500/10 text-purple-600" />
        <StatCard label="Verified"     value={stats.verified}     icon={CheckCircle2}  accent="bg-emerald-500/10 text-emerald-600" />
        <StatCard label="Rejected"     value={stats.rejected}     icon={XCircle}       accent="bg-red-500/10 text-red-600" />
      </div>

      {/* Needs-review alert */}
      {(stats.uploaded + stats.under_review) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-200 rounded-xl text-amber-700"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            <strong>{stats.uploaded + stats.under_review}</strong> agreement
            {(stats.uploaded + stats.under_review) !== 1 ? "s" : ""} awaiting review.
          </p>
          <Button
            variant="outline" size="sm"
            className="ml-auto border-amber-300 text-amber-700 hover:bg-amber-50 flex-shrink-0"
            onClick={() => setStatusFilter("uploaded")}
          >
            View uploaded
          </Button>
        </motion.div>
      )}

      {/* Create agreement form (collapsible) */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium text-foreground"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Create New Agreement
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCreate ? "rotate-180" : ""}`} />
        </button>

        {showCreate && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }}
            className="overflow-hidden"
          >
            <div className="p-4 grid md:grid-cols-3 gap-4 border-t border-border">
              <div>
                <Label className="text-xs mb-1.5 block">Client *</Label>
                <Select value={newUserId} onValueChange={setNewUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.display_name ?? u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Property *</Label>
                <Select value={newPropertyId} onValueChange={setNewPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {dbProperties.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Agreement Document (optional)</Label>
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setNewDocFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    {newDocFile ? newDocFile.name.slice(0, 20) + "…" : "Attach Document"}
                  </Button>
                  {newDocFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground"
                      onClick={() => setNewDocFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="md:col-span-3 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating || !newUserId || !newPropertyId}>
                  {creating
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                    : <><Plus className="w-4 h-4 mr-2" /> Create Agreement</>}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, property, ID…"
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG)
              .filter(([key]) => !["Pending","Approved","Rejected"].includes(key))
              .map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {dbProperties.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {filtered.length} of {enriched.length}
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground text-sm">Loading agreements…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileSignature className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No agreements found</h3>
          <p className="text-muted-foreground text-sm">
            {hasFilters ? "Try adjusting your filters." : "Create an agreement to get started."}
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
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((agr, i) => {
                const needsReview = ["uploaded", "under_review"].includes(agr.agreement_status);
                return (
                  <motion.tr
                    key={agr.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                      needsReview ? "bg-amber-500/5" : ""
                    }`}
                    onClick={() => setSelected(agr)}
                  >
                    {/* Client */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                          {(agr.userName[0] ?? "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                            {agr.userName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {agr.userEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Property */}
                    <TableCell>
                      <p className="text-sm text-foreground truncate max-w-[140px]">
                        {agr.propertyTitle}
                      </p>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <AgreementStatusBadge status={agr.agreement_status} size="sm" />
                    </TableCell>

                    {/* Created */}
                    <TableCell>
                      <p className="text-sm text-foreground">
                        {format(new Date(agr.created_at), "d MMM yyyy")}
                      </p>
                    </TableCell>

                    {/* Uploaded */}
                    <TableCell>
                      {agr.signed_uploaded_at ? (
                        <p className="text-sm text-foreground">
                          {format(new Date(agr.signed_uploaded_at), "d MMM yyyy")}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Verified */}
                    <TableCell>
                      {agr.verified_at ? (
                        <p className="text-sm text-foreground">
                          {format(new Date(agr.verified_at), "d MMM yyyy")}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 px-2.5 text-xs gap-1"
                          onClick={(e) => { e.stopPropagation(); setSelected(agr); }}
                        >
                          <Eye className="w-3 h-3" /> Review
                        </Button>
                        {needsReview && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={(e) => quickAction(agr, "verified", e)}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm" variant="destructive"
                              className="h-7 px-2.5 text-xs"
                              onClick={(e) => quickAction(agr, "rejected", e)}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </>
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
      <AgreementDetailsModal
        agreement={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onStatusChange={() => { refetch(); setSelected(null); }}
        isSuperAdmin
        propertyTitle={selected?.propertyTitle}
        propertyImage={selected?.propertyImage}
        userName={selected?.userName}
        userEmail={selected?.userEmail}
      />
    </div>
  );
};

export default AdminAgreementsTab;