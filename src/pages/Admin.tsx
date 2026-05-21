import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, Activity, Shield, ShieldCheck, Search, Eye,
  CheckCircle2, TrendingUp, BarChart3, FileSignature, CreditCard, XCircle,
  Building2, Plus, Pencil, Trash2, BedDouble, CalendarCheck, Archive,
  RotateCcw, FileText, Ban, UserCheck, UserX, Crown, ChevronDown,
  AlertTriangle, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { properties as staticProperties } from "@/data/properties";
import EnquiryDetailModal from "@/components/EnquiryDetailModal";
import PropertyFormDialog from "@/components/admin/PropertyFormDialog";
import AdminRoomsTab from "@/components/admin/AdminRoomsTab";
import AdminStaysBookingsTab from "@/components/admin/AdminStaysBookingsTab";
import AccessDenied from "@/components/admin/AccessDenied";
import { useToast } from "@/hooks/use-toast";
import type { AdminTabId } from "@/hooks/usePermissions";

const PROPERTY_STATUSES = ["Available", "Reserved", "Sold"] as const;
const RENTAL_KINDS = ["rental_property", "hotel", "commercial_rental"];

const sendNotification = async (payload: any) => {
  try { await supabase.functions.invoke("send-notification-email", { body: payload }); }
  catch (e) { console.error("notification email failed", e); }
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const roleColor: Record<string, string> = {
  super_admin: "bg-purple-500/10 text-purple-600",
  admin:       "bg-primary/10 text-primary",
  moderator:   "bg-blue-500/10 text-blue-600",
  user:        "bg-muted text-muted-foreground",
};

const RoleBadge = ({ role }: { role: string }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${roleColor[role] || roleColor.user}`}>
    {role === "super_admin" && <Crown className="w-3 h-3" />}
    {role.replace(/_/g, " ")}
  </span>
);

const propStatusColor: Record<string, string> = {
  Available: "bg-emerald-500/10 text-emerald-600",
  Reserved:  "bg-amber-500/10 text-amber-600",
  Sold:      "bg-red-500/10 text-red-600",
  Rented:    "bg-blue-500/10 text-blue-600",
};

// ── Restricted Tab Placeholder ────────────────────────────────────────────────

const RestrictedTabContent = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
      <Lock className="w-8 h-8 text-destructive" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">Super Admin Only</h3>
    <p className="text-muted-foreground text-sm text-center max-w-sm">
      This section is restricted to Super Admin users only. Contact your system administrator for elevated access.
    </p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdmin();
  const { canAccess, allowedTabs } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Default to first allowed tab
  const defaultTab = useMemo<AdminTabId>(() => {
    if (isSuperAdmin) return "overview";
    if (isAdmin) return "properties";
    return "properties";
  }, [isSuperAdmin, isAdmin]);

  const [activeTab, setActiveTab] = useState<AdminTabId>(defaultTab);

  // Reset to valid tab when permissions load
  useEffect(() => {
    if (!adminLoading && !allowedTabs.includes(activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [adminLoading, allowedTabs, activeTab, defaultTab]);

  // ── Data ──────────────────────────────────────────────────────────────────────
  const [allUsers,       setAllUsers]       = useState<any[]>([]);
  const [allInquiries,   setAllInquiries]   = useState<any[]>([]);
  const [allAgreements,  setAllAgreements]  = useState<any[]>([]);
  const [allPayments,    setAllPayments]    = useState<any[]>([]);
  const [activityLogs,   setActivityLogs]   = useState<any[]>([]);
  const [dbProperties,   setDbProperties]   = useState<any[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [selectedInquiry,    setSelectedInquiry]    = useState<any>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [editingProperty,    setEditingProperty]    = useState<any | null>(null);
  const [selectedPropIds,    setSelectedPropIds]    = useState<Set<number>>(new Set());
  const [bulkLoading,        setBulkLoading]        = useState(false);

  // User management
  const [userSearch,      setUserSearch]      = useState("");
  const [userRoleFilter,  setUserRoleFilter]  = useState("all");
  const [userStatusFilter,setUserStatusFilter]= useState("all");
  const [suspendReason,   setSuspendReason]   = useState("");
  const [suspendTarget,   setSuspendTarget]   = useState<any | null>(null);

  // Property filters
  const [propertyTab,          setPropertyTab]          = useState<"active"|"archived">("active");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState("all");
  const [propertySearch,       setPropertySearch]       = useState("");

  // Enquiry filters
  const [inquiryStatusFilter,   setInquiryStatusFilter]   = useState("all");
  const [inquiryPropertyFilter, setInquiryPropertyFilter] = useState("all");

  // Agreement creation
  const [newAgrUserId,    setNewAgrUserId]    = useState("");
  const [newAgrPropertyId,setNewAgrPropertyId]= useState("");
  const [newAgrDoc,       setNewAgrDoc]       = useState<File | null>(null);
  const [creatingAgr,     setCreatingAgr]     = useState(false);

  // ── Guards ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user)    { navigate("/auth");      return; }
      if (!isAdmin) { navigate("/dashboard"); return; }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "agreements" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments"   }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  // ── Data fetch ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    // Only fetch sensitive data if super_admin
    const promises: Promise<any>[] = [
      (supabase as any).from("properties").select("*").order("id"),
    ];

    if (isSuperAdmin) {
      promises.push(
        (supabase as any).rpc("list_users_with_roles"),
        (supabase as any).from("inquiries").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("agreements").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("payments").select("*").order("created_at",  { ascending: false }),
        (supabase as any).from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
      );
    }

    const results = await Promise.all(promises);
    setDbProperties(results[0].data || []);

    if (isSuperAdmin && results.length > 1) {
      setAllUsers(results[1].data || []);
      setAllInquiries(results[2].data || []);
      setAllAgreements(results[3].data || []);
      setAllPayments(results[4].data || []);
      setActivityLogs(results[5].data || []);
    }
  };

  // ── Derived data ──
  const rentalProperties  = dbProperties.filter((p: any) => RENTAL_KINDS.includes(p.listing_kind));
  const salesProperties   = dbProperties.filter((p: any) => !RENTAL_KINDS.includes(p.listing_kind));
  const activeProps       = salesProperties.filter((p: any) => !p.is_archived && !p.deleted_at);
  const archivedProps     = salesProperties.filter((p: any) =>  p.is_archived ||  p.deleted_at);
  const pendingAgreements = isSuperAdmin ? allAgreements.filter(a => a.approval_status === "Pending" && a.signature_url).length : 0;
  const pendingPayments   = isSuperAdmin ? allPayments.filter(p => p.status === "Pending").length : 0;

  const displayedProperties = useMemo(() => {
    let list = propertyTab === "active" ? activeProps : archivedProps;
    if (propertyStatusFilter !== "all")
      list = list.filter((p: any) => p.status === propertyStatusFilter);
    if (propertySearch.trim()) {
      const s = propertySearch.toLowerCase();
      list = list.filter((p: any) =>
        p.title.toLowerCase().includes(s) || p.location.toLowerCase().includes(s));
    }
    return list;
  }, [dbProperties, propertyTab, propertyStatusFilter, propertySearch]);

  const filteredUsers = useMemo(() => {
    if (!isSuperAdmin) return [];
    let list = allUsers;
    if (userSearch.trim()) {
      const s = userSearch.toLowerCase();
      list = list.filter((u: any) =>
        (u.email || "").toLowerCase().includes(s) ||
        (u.display_name || "").toLowerCase().includes(s));
    }
    if (userRoleFilter !== "all")
      list = list.filter((u: any) => (u.roles || []).includes(userRoleFilter));
    if (userStatusFilter === "active")    list = list.filter((u: any) => !u.suspended);
    if (userStatusFilter === "suspended") list = list.filter((u: any) =>  u.suspended);
    return list;
  }, [allUsers, userSearch, userRoleFilter, userStatusFilter, isSuperAdmin]);

  const filteredInquiries = isSuperAdmin ? allInquiries.filter(i => {
    if (inquiryStatusFilter   !== "all" && i.status      !== inquiryStatusFilter)   return false;
    if (inquiryPropertyFilter !== "all" && String(i.property_id) !== inquiryPropertyFilter) return false;
    return true;
  }) : [];

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getPropDisplay = (propId: number) => {
    const db  = dbProperties.find((p: any) => p.id === propId);
    const sta = staticProperties.find(p => p.id === propId);
    return {
      title: db?.title || sta?.title || `Property #${propId}`,
      image: sta?.image || db?.image_url || "/placeholder.svg",
    };
  };
  const getUser = (uid: string) => allUsers.find((u: any) => u.user_id === uid);

  // ── Property actions ──────────────────────────────────────────────────────────
  const rpc = async (fn: string, args: any, successMsg: string) => {
    const { error } = await (supabase as any).rpc(fn, args);
    if (error) toast({ title: "Action failed", description: error.message, variant: "destructive" });
    else { toast({ title: successMsg }); fetchData(); }
  };

  const handleArchive        = (id: number) => rpc("archive_property",          { _property_id: id }, "Property archived");
  const handleRestore        = (id: number) => rpc("restore_property",          { _property_id: id }, "Property restored");
  const handlePermDelete     = (id: number) => rpc("permanent_delete_property", { _property_id: id }, "Property permanently deleted");

  // Super admin only actions
  const handleReactivateUser = (uid: string) => {
    if (!isSuperAdmin) return;
    rpc("reactivate_user", { _target_user_id: uid }, "User reactivated");
  };
  const handleAssignRole  = (uid: string, role: string) => {
    if (!isSuperAdmin) return;
    rpc("assign_role", { _target_user_id: uid, _role: role }, `Role "${role}" granted`);
  };
  const handleRevokeRole  = (uid: string, role: string) => {
    if (!isSuperAdmin) return;
    rpc("revoke_role", { _target_user_id: uid, _role: role }, `Role "${role}" revoked`);
  };

  const handleChangeStatus = async (id: number, status: string) => {
    const { error } = await (supabase as any).from("properties")
      .update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Failed", variant: "destructive" });
    else { toast({ title: `Status → ${status}` }); fetchData(); }
  };

  const handleBulkAction = async (action: "archive"|"restore"|"delete") => {
    if (selectedPropIds.size === 0) return;
    setBulkLoading(true);
    const fn = action === "archive" ? "archive_property"
             : action === "restore" ? "restore_property"
             : "permanent_delete_property";
    await Promise.all(Array.from(selectedPropIds).map(id =>
      (supabase as any).rpc(fn, { _property_id: id })));
    setSelectedPropIds(new Set());
    fetchData(); setBulkLoading(false);
    toast({ title: `${selectedPropIds.size} ${action}d` });
  };

  const toggleSelectAll = (list: any[]) =>
    setSelectedPropIds(selectedPropIds.size === list.length ? new Set() : new Set(list.map((p: any) => p.id)));

  // ── User actions (super admin only) ──────────────────────────────────────────
  const handleSuspendUser = async (u: any) => {
    if (!isSuperAdmin) return;
    const { error } = await (supabase as any).rpc("suspend_user", {
      _target_user_id: u.user_id, _reason: suspendReason || null,
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "User suspended" }); setSuspendTarget(null); setSuspendReason(""); fetchData(); }
  };

  const handlePermDeleteUser = async (uid: string, email: string) => {
    if (!isSuperAdmin) return;
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error) toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    else { toast({ title: `${email} deleted` }); fetchData(); }
  };

  // ── Agreement / payment actions (super admin only) ───────────────────────────
  const handleApproveAgreement = async (agr: any) => {
    if (!isSuperAdmin) return;
    await (supabase as any).from("agreements")
      .update({ approval_status: "Approved", updated_at: new Date().toISOString() }).eq("id", agr.id);
    toast({ title: "Agreement approved!" });
    const u = getUser(agr.user_id); const { title } = getPropDisplay(agr.property_id);
    sendNotification({ type: "agreement_approved", userId: agr.user_id, recipientName: u?.display_name, propertyTitle: title });
    fetchData();
  };
  const handleRejectAgreement = async (id: string) => {
    if (!isSuperAdmin) return;
    await (supabase as any).from("agreements")
      .update({ approval_status: "Rejected", updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Rejected" }); fetchData();
  };
  const handleConfirmPayment = async (pay: any) => {
    if (!isSuperAdmin) return;
    await (supabase as any).from("payments").update({ status: "Confirmed" }).eq("id", pay.id);
    toast({ title: "Payment confirmed!" });
    const u = getUser(pay.user_id); const { title } = getPropDisplay(pay.property_id);
    sendNotification({ type: "payment_confirmed", userId: pay.user_id, recipientName: u?.display_name, propertyTitle: title, amount: pay.amount });
    fetchData();
  };
  const handleRejectPayment = async (id: string) => {
    if (!isSuperAdmin) return;
    await (supabase as any).from("payments").update({ status: "Rejected" }).eq("id", id);
    toast({ title: "Rejected" }); fetchData();
  };
  const handleCreateAgreement = async () => {
    if (!isSuperAdmin || !newAgrUserId || !newAgrPropertyId) return;
    setCreatingAgr(true);
    let docUrl = null;
    if (newAgrDoc) {
      const path = `admin/${Date.now()}_${newAgrDoc.name}`;
      const { data } = await supabase.storage.from("agreements").upload(path, newAgrDoc);
      if (data) { const { data: ud } = supabase.storage.from("agreements").getPublicUrl(path); docUrl = ud.publicUrl; }
    }
    const propId = parseInt(newAgrPropertyId);
    await (supabase as any).from("agreements").insert({ user_id: newAgrUserId, property_id: propId, document_url: docUrl, approval_status: "Pending" });
    toast({ title: "Agreement created!" });
    const u = getUser(newAgrUserId); const { title } = getPropDisplay(propId);
    sendNotification({ type: "agreement_created", userId: newAgrUserId, recipientName: u?.display_name, propertyTitle: title });
    setNewAgrUserId(""); setNewAgrPropertyId(""); setNewAgrDoc(null);
    fetchData(); setCreatingAgr(false);
  };

  // ── Tab definitions ───────────────────────────────────────────────────────────
  // All tabs — visibility is controlled by RBAC
  const allTabs = [
    { id: "overview"       as AdminTabId, label: "Overview",       icon: BarChart3,    superOnly: true },
    { id: "users"          as AdminTabId, label: "Users",          icon: Users,        superOnly: true, badge: isSuperAdmin ? allUsers.filter((u: any) => u.suspended).length : 0 },
    { id: "enquiries"      as AdminTabId, label: "Enquiries",      icon: MessageSquare,superOnly: true },
    { id: "properties"     as AdminTabId, label: "Properties",     icon: Building2,    superOnly: false },
    { id: "rooms"          as AdminTabId, label: "Rooms",          icon: BedDouble,    superOnly: false },
    { id: "stays_bookings" as AdminTabId, label: "Stays Bookings", icon: CalendarCheck,superOnly: false },
    { id: "agreements"     as AdminTabId, label: "Agreements",     icon: FileSignature, superOnly: true, badge: pendingAgreements },
    { id: "payments"       as AdminTabId, label: "Payments",       icon: CreditCard,   superOnly: true, badge: pendingPayments },
    { id: "activity"       as AdminTabId, label: "Activity",       icon: Activity,     superOnly: true },
  ];

  // Only show tabs the user can access
  const visibleTabs = allTabs.filter(tab => canAccess(tab.id));

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground flex items-center gap-2">
                Admin Panel
                {isSuperAdmin && (
                  <span className="text-sm px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 font-medium flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />Super Admin
                  </span>
                )}
                {isAdmin && !isSuperAdmin && (
                  <span className="text-sm px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />Admin
                  </span>
                )}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isSuperAdmin
                  ? "Full system access — manage users, properties, rooms, bookings, agreements and payments"
                  : "Property management — manage properties, rooms and bookings"}
              </p>
            </div>
          </div>

          {/* Super admin only nav links */}
          {isSuperAdmin && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild><Link to="/admin/roles"><ShieldCheck className="w-4 h-4 mr-1" />Roles</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/admin/audit"><FileText className="w-4 h-4 mr-1" />Audit Log</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/admin/diagnostics">Diagnostics</Link></Button>
            </div>
          )}

          {/* Admin-only notice */}
          {isAdmin && !isSuperAdmin && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-500/10 text-amber-700 rounded-lg text-sm max-w-max">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>You have limited admin access. Contact a Super Admin for elevated permissions.</span>
            </div>
          )}
        </motion.div>

        {/* Tab bar — only show allowed tabs */}
        <div className="flex gap-1 mb-8 border-b border-border pb-[1px] overflow-x-auto">
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {(tab as any).badge > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500">{(tab as any).badge}</span>
              )}
            </button>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* Guard: show restricted if user tries to access a tab they can't */}
          {!canAccess(activeTab) ? (
            <AccessDenied />
          ) : (

          <>
          {/* ── Overview (super admin only) ───────────────────────────────── */}
          {activeTab === "overview" && isSuperAdmin && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users",       value: allUsers.length,                       icon: Users,         sub: `${allUsers.filter((u: any) => u.suspended).length} suspended` },
                  { label: "Total Enquiries",   value: allInquiries.length,                   icon: MessageSquare, sub: `${allInquiries.filter(i => i.status === "pending").length} pending` },
                  { label: "Active Properties", value: activeProps.length,                    icon: Building2,     sub: `${archivedProps.length} archived` },
                  { label: "Pending Actions",   value: pendingAgreements + pendingPayments,   icon: AlertTriangle, sub: `${pendingAgreements} agr · ${pendingPayments} pay` },
                ].map((s, i) => (
                  <Card key={i}><CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-primary/10"><s.icon className="w-5 h-5 text-primary" /></div>
                      <div>
                        <p className="text-sm text-muted-foreground">{s.label}</p>
                        <p className="text-2xl font-display font-semibold">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                      </div>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Most Enquired</CardTitle></CardHeader>
                <CardContent>
                  {Object.entries(allInquiries.reduce((acc: Record<number,number>, i) => {
                    if (i.property_id) acc[i.property_id] = (acc[i.property_id] || 0) + 1; return acc;
                  }, {})).sort(([,a],[,b]) => (b as number)-(a as number)).slice(0,5).map(([id, count]) => {
                    const { title, image } = getPropDisplay(Number(id));
                    return (
                      <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 mb-2">
                        <img src={image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        <span className="flex-1 text-sm font-medium">{title}</span>
                        <span className="text-sm font-semibold text-primary">{count as number} enquiries</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Users (super admin only) ───────────────────────────────────── */}
          {activeTab === "users" && isSuperAdmin && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search by name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {["super_admin","admin","moderator","user"].map(r => (
                      <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g," ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground self-center ml-auto">{filteredUsers.length} users</p>
              </div>

              <AlertDialog open={!!suspendTarget} onOpenChange={o => { if (!o) { setSuspendTarget(null); setSuspendReason(""); } }}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspend {suspendTarget?.display_name || suspendTarget?.email}?</AlertDialogTitle>
                    <AlertDialogDescription>This user will be blocked from logging in.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <Label>Reason (optional)</Label>
                    <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Explain reason…" rows={2} />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleSuspendUser(suspendTarget)}>Suspend</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead><TableHead>Registered</TableHead>
                      <TableHead>Last Login</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u: any) => {
                      const isSelf = u.user_id === user?.id;
                      const roles: string[] = u.roles || [];
                      const isUserSuperAdmin = roles.includes("super_admin");
                      const isUserAdmin      = roles.includes("admin");
                      return (
                        <TableRow key={u.user_id} className={u.suspended ? "opacity-60" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                                {(u.display_name || u.email || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{u.display_name || "—"}</p>
                                {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {roles.length === 0 && <span className="text-xs text-muted-foreground">user</span>}
                              {roles.map((r: string) => <RoleBadge key={r} role={r} />)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.suspended ? (
                              <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-medium">Suspended</span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">Active</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">Actions <ChevronDown className="w-3 h-3 ml-1" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                {!isUserAdmin && !isUserSuperAdmin && (
                                  <DropdownMenuItem onClick={() => handleAssignRole(u.user_id, "admin")}>
                                    <ShieldCheck className="w-4 h-4 mr-2" />Promote to Admin
                                  </DropdownMenuItem>
                                )}
                                {isUserAdmin && !isUserSuperAdmin && (
                                  <DropdownMenuItem onClick={() => handleRevokeRole(u.user_id, "admin")}>
                                    <Shield className="w-4 h-4 mr-2" />Revoke Admin
                                  </DropdownMenuItem>
                                )}
                                {!isUserSuperAdmin && (
                                  <DropdownMenuItem onClick={() => handleAssignRole(u.user_id, "super_admin")}>
                                    <Crown className="w-4 h-4 mr-2" />Grant Super Admin
                                  </DropdownMenuItem>
                                )}
                                {isUserSuperAdmin && !isSelf && (
                                  <DropdownMenuItem onClick={() => handleRevokeRole(u.user_id, "super_admin")}>
                                    <Crown className="w-4 h-4 mr-2" />Revoke Super Admin
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {!u.suspended && !isSelf && (
                                  <DropdownMenuItem onClick={() => setSuspendTarget(u)} className="text-amber-600">
                                    <Ban className="w-4 h-4 mr-2" />Suspend User
                                  </DropdownMenuItem>
                                )}
                                {u.suspended && (
                                  <DropdownMenuItem onClick={() => handleReactivateUser(u.user_id)} className="text-emerald-600">
                                    <UserCheck className="w-4 h-4 mr-2" />Reactivate User
                                  </DropdownMenuItem>
                                )}
                                {!isSelf && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                                          <UserX className="w-4 h-4 mr-2" />Permanently Delete
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Permanently delete user?</AlertDialogTitle>
                                          <AlertDialogDescription>Removes {u.email} and all their data. Cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
                                            onClick={() => handlePermDeleteUser(u.user_id, u.email)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No users found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </div>
          )}

          {/* ── Enquiries (super admin only) ───────────────────────────────── */}
          {activeTab === "enquiries" && isSuperAdmin && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Select value={inquiryStatusFilter} onValueChange={setInquiryStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={inquiryPropertyFilter} onValueChange={setInquiryPropertyFilter}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Property" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {dbProperties.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Property</TableHead><TableHead>From</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead /></TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInquiries.map(inq => {
                      const { title, image } = getPropDisplay(inq.property_id);
                      return (
                        <TableRow key={inq.id}>
                          <TableCell><div className="flex items-center gap-2"><img src={image} alt="" className="w-10 h-10 rounded-lg object-cover" /><span className="text-sm font-medium truncate max-w-[100px]">{title}</span></div></TableCell>
                          <TableCell><p className="text-sm font-medium">{inq.name}</p><p className="text-xs text-muted-foreground">{inq.email}</p></TableCell>
                          <TableCell><p className="text-sm text-muted-foreground truncate max-w-[160px]">{inq.message}</p></TableCell>
                          <TableCell><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${inq.status==="pending"?"bg-amber-500/10 text-amber-600":inq.status==="responded"?"bg-emerald-500/10 text-emerald-600":"bg-muted text-muted-foreground"}`}>{inq.status}</span></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(inq.created_at).toLocaleDateString()}</TableCell>
                          <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedInquiry(inq)}><Eye className="w-4 h-4" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredInquiries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No enquiries found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </div>
          )}

          {/* ── Properties (admin + super admin) ──────────────────────────── */}
          {activeTab === "properties" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search…" value={propertySearch} onChange={e => setPropertySearch(e.target.value)} className="pl-9" />
                </div>
                {propertyTab === "active" && (
                  <Select value={propertyStatusFilter} onValueChange={setPropertyStatusFilter}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {PROPERTY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm text-muted-foreground ml-auto">{displayedProperties.length} shown</p>
                <Button onClick={() => { setEditingProperty(null); setPropertyDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" />New Property
                </Button>
              </div>

              {selectedPropIds.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20 flex-wrap">
                  <span className="text-sm font-medium text-primary">{selectedPropIds.size} selected</span>
                  <div className="flex gap-2 ml-auto flex-wrap">
                    {propertyTab === "active" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" disabled={bulkLoading}><Archive className="w-4 h-4 mr-1" />Archive All</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Archive {selectedPropIds.size} properties?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleBulkAction("archive")}>Archive</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {propertyTab === "archived" && (
                      <Button size="sm" variant="outline" onClick={() => handleBulkAction("restore")} disabled={bulkLoading}>
                        <RotateCcw className="w-4 h-4 mr-1" />Restore All
                      </Button>
                    )}
                    {isSuperAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={bulkLoading}><Trash2 className="w-4 h-4 mr-1" />Delete All</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Permanently delete {selectedPropIds.size} properties?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={() => handleBulkAction("delete")}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setSelectedPropIds(new Set())}>Clear</Button>
                  </div>
                </div>
              )}

              <Tabs value={propertyTab} onValueChange={(v: any) => { setPropertyTab(v); setSelectedPropIds(new Set()); }}>
                <TabsList>
                  <TabsTrigger value="active">Active ({activeProps.length})</TabsTrigger>
                  <TabsTrigger value="archived">Archived ({archivedProps.length})</TabsTrigger>
                </TabsList>

                {(["active","archived"] as const).map(tab => (
                  <TabsContent key={tab} value={tab} className="mt-4">
                    {displayedProperties.length === 0 ? (
                      <div className="text-center py-16"><Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No {tab} properties</p></div>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer ml-2">
                          <Checkbox checked={selectedPropIds.size === displayedProperties.length && displayedProperties.length > 0} onCheckedChange={() => toggleSelectAll(displayedProperties)} />
                          Select all
                        </label>
                        {displayedProperties.map((prop: any) => {
                          const sta = staticProperties.find(p => p.id === prop.id);
                          const image = prop.image_url || sta?.image || "/placeholder.svg";
                          const enquiryCount = isSuperAdmin ? allInquiries.filter(i => i.property_id === prop.id).length : 0;
                          const isSelected = selectedPropIds.has(prop.id);
                          return (
                            <Card key={prop.id} className={isSelected ? "border-primary/50 bg-primary/5" : ""}>
                              <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                  <Checkbox checked={isSelected} onCheckedChange={checked => {
                                    const n = new Set(selectedPropIds);
                                    checked ? n.add(prop.id) : n.delete(prop.id);
                                    setSelectedPropIds(n);
                                  }} />
                                  <img src={image} alt={prop.title} className="w-20 h-16 rounded-xl object-cover flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h4 className="font-semibold truncate">{prop.title}</h4>
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${propStatusColor[prop.status] || "bg-muted text-muted-foreground"}`}>{prop.status}</span>
                                      {prop.featured && <span className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary">Featured</span>}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{prop.location} · {prop.price}</p>
                                    {isSuperAdmin && <p className="text-xs text-muted-foreground mt-0.5">{enquiryCount} enquiries</p>}
                                  </div>
                                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                                    {!prop.is_archived && !prop.deleted_at && (
                                      <Select value={prop.status} onValueChange={v => handleChangeStatus(prop.id, v)}>
                                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>{PROPERTY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                      </Select>
                                    )}
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditingProperty(prop); setPropertyDialogOpen(true); }}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    {!prop.is_archived ? (
                                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleArchive(prop.id)}>
                                        <Archive className="w-3.5 h-3.5 mr-1" />Archive
                                      </Button>
                                    ) : (
                                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleRestore(prop.id)}>
                                        <RotateCcw className="w-3.5 h-3.5 mr-1" />Restore
                                      </Button>
                                    )}
                                    {isSuperAdmin && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader><AlertDialogTitle>Permanently delete?</AlertDialogTitle><AlertDialogDescription>"{prop.title}" cannot be recovered.</AlertDialogDescription></AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive" onClick={() => handlePermDelete(prop.id)}>Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {/* ── Rooms (admin + super admin) ────────────────────────────────── */}
          {activeTab === "rooms"          && <AdminRoomsTab rentalProperties={rentalProperties} />}
          {activeTab === "stays_bookings" && <AdminStaysBookingsTab rentalProperties={rentalProperties} />}

          {/* ── Agreements (super admin only) ──────────────────────────────── */}
          {activeTab === "agreements" && isSuperAdmin && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Create Agreement</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Select value={newAgrUserId} onValueChange={setNewAgrUserId}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>{allUsers.map((u: any) => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={newAgrPropertyId} onValueChange={setNewAgrPropertyId}>
                      <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                      <SelectContent>{dbProperties.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="file" accept=".pdf,.doc,.docx" onChange={e => setNewAgrDoc(e.target.files?.[0] || null)} />
                  </div>
                  <Button onClick={handleCreateAgreement} disabled={creatingAgr || !newAgrUserId || !newAgrPropertyId} className="mt-4">
                    {creatingAgr ? "Creating…" : "Create Agreement"}
                  </Button>
                </CardContent>
              </Card>
              {allAgreements.filter(a => a.approval_status === "Pending" && a.signature_url).map(agr => {
                const { title } = getPropDisplay(agr.property_id);
                const u = getUser(agr.user_id);
                return (
                  <div key={agr.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-muted/30 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{u?.display_name || u?.email}</p>
                      {agr.signature_url && <img src={agr.signature_url} alt="Sig" className="h-10 mt-2 border border-border rounded" />}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApproveAgreement(agr)}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectAgreement(agr.id)}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Payments (super admin only) ────────────────────────────────── */}
          {activeTab === "payments" && isSuperAdmin && (
            <div className="space-y-4">
              {allPayments.filter(p => p.status === "Pending").map(pay => {
                const { title } = getPropDisplay(pay.property_id);
                const u = getUser(pay.user_id);
                return (
                  <div key={pay.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-muted/30 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{title} — ${pay.amount?.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{u?.display_name || u?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleConfirmPayment(pay)}><CheckCircle2 className="w-4 h-4 mr-1" />Confirm</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectPayment(pay.id)}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  </div>
                );
              })}
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {allPayments.map(pay => {
                      const { title } = getPropDisplay(pay.property_id);
                      const u = getUser(pay.user_id);
                      return (
                        <TableRow key={pay.id}>
                          <TableCell className="font-medium">{title}</TableCell>
                          <TableCell className="text-muted-foreground">{u?.display_name || u?.email}</TableCell>
                          <TableCell className="font-semibold">${pay.amount?.toLocaleString()}</TableCell>
                          <TableCell><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${pay.status==="Confirmed"?"bg-emerald-500/10 text-emerald-600":pay.status==="Rejected"?"bg-red-500/10 text-red-600":"bg-amber-500/10 text-amber-600"}`}>{pay.status}</span></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(pay.payment_date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </div>
          )}

          {/* ── Activity (super admin only) ────────────────────────────────── */}
          {activeTab === "activity" && isSuperAdmin && (
            <Card><CardContent className="p-0">
              {activityLogs.length === 0 ? (
                <div className="text-center py-16"><Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No activity yet</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>Details</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {activityLogs.map(log => {
                      const u = allUsers.find((u: any) => u.user_id === log.user_id);
                      return (
                        <TableRow key={log.id}>
                          <TableCell><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{log.action}</span></TableCell>
                          <TableCell className="text-sm">{u?.display_name || u?.email || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{log.metadata ? JSON.stringify(log.metadata).slice(0,80) : "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          )}
          </>
          )}

        </motion.div>
      </div>

      <EnquiryDetailModal inquiry={selectedInquiry} open={!!selectedInquiry} onClose={() => setSelectedInquiry(null)} onStatusChange={fetchData} />
      <PropertyFormDialog open={propertyDialogOpen} onClose={() => setPropertyDialogOpen(false)} property={editingProperty} onSaved={fetchData} />
    </div>
  );
};

export default Admin;