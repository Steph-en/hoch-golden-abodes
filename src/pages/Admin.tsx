import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, Activity, Shield, Search, Eye, Clock, CheckCircle2, TrendingUp,
  UserPlus, BarChart3, FileSignature, CreditCard, XCircle, Upload, Building2, Plus, Pencil, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { properties as staticProperties } from "@/data/properties";
import EnquiryDetailModal from "@/components/EnquiryDetailModal";
import PropertyFormDialog from "@/components/admin/PropertyFormDialog";
import { useToast } from "@/hooks/use-toast";

const PROPERTY_STATUSES = ["Available", "Reserved", "Sold"] as const;

const sendNotification = async (payload: any) => {
  try {
    await supabase.functions.invoke("send-notification-email", { body: payload });
  } catch (e) {
    console.error("notification email failed", e);
  }
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "enquiries" | "properties" | "agreements" | "payments" | "activity">("overview");
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [allInquiries, setAllInquiries] = useState<any[]>([]);
  const [allAgreements, setAllAgreements] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [dbProperties, setDbProperties] = useState<any[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);

  const [userSearch, setUserSearch] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");
  const [inquiryPropertyFilter, setInquiryPropertyFilter] = useState("all");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState("all");

  // Agreement creation
  const [newAgrUserId, setNewAgrUserId] = useState("");
  const [newAgrPropertyId, setNewAgrPropertyId] = useState("");
  const [newAgrDoc, setNewAgrDoc] = useState<File | null>(null);
  const [creatingAgr, setCreatingAgr] = useState(false);

  // Property CRUD
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) { navigate("/auth"); return; }
      if (!isAdmin) { navigate("/dashboard"); return; }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agreements" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  const fetchData = async () => {
    const [profilesRes, inquiriesRes, agreementsRes, paymentsRes, activityRes, propsRes] = await Promise.all([
      (supabase as any).from("profiles").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("inquiries").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("agreements").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("payments").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("properties").select("*").order("id"),
    ]);
    setAllProfiles(profilesRes.data || []);
    setAllInquiries(inquiriesRes.data || []);
    setAllAgreements(agreementsRes.data || []);
    setAllPayments(paymentsRes.data || []);
    setActivityLogs(activityRes.data || []);
    setDbProperties(propsRes.data || []);
  };

  const toggleSuspendUser = async (profile: any) => {
    const nextSuspended = !profile.suspended;
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ suspended: nextSuspended, suspended_at: nextSuspended ? new Date().toISOString() : null })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: nextSuspended ? "User suspended" : "User reactivated",
      description: profile.display_name || profile.id.slice(0, 8),
    });
    fetchData();
  };

  if (authLoading || adminLoading || !isAdmin) return null;

  const totalUsers = allProfiles.length;
  const totalInquiries = allInquiries.length;
  const pendingAgreements = allAgreements.filter((a) => a.approval_status === "Pending" && a.signature_url).length;
  const pendingPayments = allPayments.filter((p) => p.status === "Pending").length;

  const filteredUsers = allProfiles.filter((p) =>
    !userSearch || (p.display_name || "").toLowerCase().includes(userSearch.toLowerCase()) || p.id.includes(userSearch)
  );

  const filteredInquiries = allInquiries.filter((i) => {
    if (inquiryStatusFilter !== "all" && i.status !== inquiryStatusFilter) return false;
    if (inquiryPropertyFilter !== "all" && String(i.property_id) !== inquiryPropertyFilter) return false;
    return true;
  });

  const filteredProperties = dbProperties.filter((p) =>
    propertyStatusFilter === "all" || p.status === propertyStatusFilter
  );

  const userInquiryCounts: Record<string, number> = {};
  allInquiries.forEach((i) => { if (i.user_id) userInquiryCounts[i.user_id] = (userInquiryCounts[i.user_id] || 0) + 1; });

  const topProperties = Object.entries(
    allInquiries.reduce((acc: Record<number, number>, i) => { if (i.property_id) acc[i.property_id] = (acc[i.property_id] || 0) + 1; return acc; }, {})
  ).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5).map(([id, count]) => {
    const prop = dbProperties.find((p: any) => p.id === Number(id)) || staticProperties.find((p) => p.id === Number(id));
    return { property: prop, count };
  });

  const getProfile = (userId: string) => allProfiles.find(p => p.id === userId);
  const getPropDisplay = (propId: number) => {
    const dbProp = dbProperties.find((p: any) => p.id === propId);
    const staticProp = staticProperties.find(p => p.id === propId);
    return { title: dbProp?.title || staticProp?.title || `Property #${propId}`, image: staticProp?.image || dbProp?.image_url || "/placeholder.svg" };
  };

  const handleChangePropertyStatus = async (propertyId: number, newStatus: string) => {
    const { error } = await (supabase as any).from("properties").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", propertyId);
    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: `Property status changed to ${newStatus}` });
      fetchData();
    }
  };

  const handleApproveAgreement = async (agr: any) => {
    await (supabase as any).from("agreements").update({ approval_status: "Approved", updated_at: new Date().toISOString() }).eq("id", agr.id);
    toast({ title: "Agreement approved!" });
    const profile = getProfile(agr.user_id);
    const { title } = getPropDisplay(agr.property_id);
    sendNotification({ type: "agreement_approved", userId: agr.user_id, recipientName: profile?.display_name, propertyTitle: title });
    fetchData();
  };

  const handleRejectAgreement = async (id: string) => {
    await (supabase as any).from("agreements").update({ approval_status: "Rejected", updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Agreement rejected" });
    fetchData();
  };

  const handleConfirmPayment = async (pay: any) => {
    await (supabase as any).from("payments").update({ status: "Confirmed" }).eq("id", pay.id);
    toast({ title: "Payment confirmed!" });
    const profile = getProfile(pay.user_id);
    const { title } = getPropDisplay(pay.property_id);
    sendNotification({ type: "payment_confirmed", userId: pay.user_id, recipientName: profile?.display_name, propertyTitle: title, amount: pay.amount });
    fetchData();
  };

  const handleRejectPayment = async (id: string) => {
    await (supabase as any).from("payments").update({ status: "Rejected" }).eq("id", id);
    toast({ title: "Payment rejected" });
    fetchData();
  };

  const handleCreateAgreement = async () => {
    if (!newAgrUserId || !newAgrPropertyId) return;
    setCreatingAgr(true);
    let docUrl = null;
    if (newAgrDoc) {
      const path = `admin/${Date.now()}_${newAgrDoc.name}`;
      const { data } = await supabase.storage.from("agreements").upload(path, newAgrDoc);
      if (data) {
        const { data: urlData } = supabase.storage.from("agreements").getPublicUrl(path);
        docUrl = urlData.publicUrl;
      }
    }
    const propId = parseInt(newAgrPropertyId);
    await (supabase as any).from("agreements").insert({
      user_id: newAgrUserId,
      property_id: propId,
      document_url: docUrl,
      approval_status: "Pending",
    });
    toast({ title: "Agreement created!" });
    const profile = getProfile(newAgrUserId);
    const { title } = getPropDisplay(propId);
    sendNotification({ type: "agreement_created", userId: newAgrUserId, recipientName: profile?.display_name, propertyTitle: title });
    setNewAgrUserId("");
    setNewAgrPropertyId("");
    setNewAgrDoc(null);
    fetchData();
    setCreatingAgr(false);
  };

  const handleDeleteProperty = async (id: number) => {
    const { error } = await (supabase as any).from("properties").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Property deleted" }); fetchData(); }
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "enquiries" as const, label: "Enquiries", icon: MessageSquare },
    { id: "properties" as const, label: "Properties", icon: Building2 },
    { id: "agreements" as const, label: "Agreements", icon: FileSignature, badge: pendingAgreements },
    { id: "payments" as const, label: "Payments", icon: CreditCard, badge: pendingPayments },
    { id: "activity" as const, label: "Activity", icon: Activity },
  ];

  const statusColors: Record<string, string> = {
    Available: "bg-emerald-500/10 text-emerald-600",
    Reserved: "bg-amber-500/10 text-amber-600",
    Sold: "bg-red-500/10 text-red-600",
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"><Shield className="w-6 h-6 text-primary" /></div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">Manage users, properties, agreements, payments, and platform activity</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 mb-10 border-b border-border pb-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {(tab as any).badge > 0 && <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500">{(tab as any).badge}</span>}
            </button>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {[
                  { label: "Total Users", value: totalUsers, icon: Users },
                  { label: "Total Enquiries", value: totalInquiries, icon: MessageSquare },
                  { label: "Properties", value: dbProperties.length, icon: Building2 },
                  { label: "Pending Agreements", value: pendingAgreements, icon: FileSignature },
                  { label: "Pending Payments", value: pendingPayments, icon: CreditCard },
                ].map((stat, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10"><stat.icon className="w-5 h-5 text-primary" /></div>
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-display font-semibold text-foreground">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Property Status Summary */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Property Status Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {PROPERTY_STATUSES.map(status => {
                      const count = dbProperties.filter((p: any) => p.status === status).length;
                      return (
                        <div key={status} className="p-4 rounded-xl bg-muted/50 text-center">
                          <p className="text-sm text-muted-foreground">{status}</p>
                          <p className="text-2xl font-display font-semibold text-foreground">{count}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Most Enquired Properties</CardTitle></CardHeader>
                <CardContent>
                  {topProperties.length === 0 ? <p className="text-sm text-muted-foreground">No enquiries yet</p> : (
                    <div className="space-y-3">
                      {topProperties.map(({ property: prop, count }, i) => prop && (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                          <img src={(prop as any).image || (prop as any).image_url || "/placeholder.svg"} alt={(prop as any).title} className="w-14 h-14 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{(prop as any).title}</p>
                            <p className="text-sm text-muted-foreground">{(prop as any).location}</p>
                          </div>
                          <span className="text-sm font-semibold text-primary">{count as number} enquiries</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>User</TableHead><TableHead>Phone</TableHead><TableHead>Registered</TableHead><TableHead>Enquiries</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((profile) => (
                        <TableRow key={profile.id} className={profile.suspended ? "opacity-60" : ""}>
                          <TableCell><div><p className="font-medium text-foreground">{profile.display_name || "—"}</p><p className="text-xs text-muted-foreground">{profile.id.slice(0, 8)}...</p></div></TableCell>
                          <TableCell className="text-muted-foreground">{profile.phone || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                          <TableCell><span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{userInquiryCounts[profile.id] || 0}</span></TableCell>
                          <TableCell>
                            {profile.suspended ? (
                              <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">Suspended</span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">Active</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant={profile.suspended ? "outline" : "destructive"} size="sm">
                                  {profile.suspended ? "Reactivate" : "Suspend"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{profile.suspended ? "Reactivate user?" : "Suspend user?"}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {profile.suspended
                                      ? `${profile.display_name || "This user"} will regain access to their account.`
                                      : `${profile.display_name || "This user"} will be signed out on their next request and prevented from accessing their dashboard.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => toggleSuspendUser(profile)}>
                                    {profile.suspended ? "Reactivate" : "Suspend"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No users found</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enquiries */}
          {activeTab === "enquiries" && (
            <div className="space-y-6">
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
                    {(dbProperties.length > 0 ? dbProperties : staticProperties).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Property</TableHead><TableHead>From</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInquiries.map((inquiry) => {
                        const { title, image } = getPropDisplay(inquiry.property_id);
                        return (
                          <TableRow key={inquiry.id}>
                            <TableCell><div className="flex items-center gap-3"><img src={image} alt="" className="w-10 h-10 rounded-lg object-cover" /><span className="text-sm font-medium text-foreground truncate max-w-[120px]">{title}</span></div></TableCell>
                            <TableCell><div><p className="text-sm font-medium text-foreground">{inquiry.name}</p><p className="text-xs text-muted-foreground">{inquiry.email}</p></div></TableCell>
                            <TableCell className="max-w-[200px]"><p className="text-sm text-muted-foreground truncate">{inquiry.message}</p></TableCell>
                            <TableCell><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${inquiry.status === "pending" ? "bg-amber-500/10 text-amber-600" : inquiry.status === "responded" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{inquiry.status}</span></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(inquiry.created_at).toLocaleDateString()}</TableCell>
                            <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedInquiry(inquiry)}><Eye className="w-4 h-4" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredInquiries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No enquiries found</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Properties Management */}
          {activeTab === "properties" && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3 items-center">
                <Select value={propertyStatusFilter} onValueChange={setPropertyStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PROPERTY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground ml-auto">{filteredProperties.length} properties</p>
              </div>
              <div className="grid gap-4">
                {filteredProperties.map((prop: any) => {
                  const staticProp = staticProperties.find(p => p.id === prop.id);
                  const image = staticProp?.image || prop.image_url || "/placeholder.svg";
                  const enquiryCount = allInquiries.filter(i => i.property_id === prop.id).length;
                  const agreementCount = allAgreements.filter(a => a.property_id === prop.id).length;
                  return (
                    <Card key={prop.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <img src={image} alt={prop.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-semibold text-foreground truncate">{prop.title}</h4>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[prop.status] || "bg-muted text-muted-foreground"}`}>{prop.status}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{prop.location} • {prop.price}</p>
                            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                              <span>{enquiryCount} enquiries</span>
                              <span>{agreementCount} agreements</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <Select value={prop.status} onValueChange={(val) => handleChangePropertyStatus(prop.id, val)}>
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROPERTY_STATUSES.map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredProperties.length === 0 && (
                  <div className="text-center py-20">
                    <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No properties found</h3>
                    <p className="text-muted-foreground">No properties match the selected filter</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agreements */}
          {activeTab === "agreements" && (
            <div className="space-y-8">
              <Card>
                <CardHeader><CardTitle>Create Agreement</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Select value={newAgrUserId} onValueChange={setNewAgrUserId}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>
                        {allProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name || p.id.slice(0, 8)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={newAgrPropertyId} onValueChange={setNewAgrPropertyId}>
                      <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                      <SelectContent>
                        {(dbProperties.length > 0 ? dbProperties : staticProperties).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setNewAgrDoc(e.target.files?.[0] || null)} />
                  </div>
                  <Button onClick={handleCreateAgreement} disabled={creatingAgr || !newAgrUserId || !newAgrPropertyId} className="mt-4">
                    {creatingAgr ? "Creating..." : "Create Agreement"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Pending Approvals ({pendingAgreements})</CardTitle></CardHeader>
                <CardContent>
                  {allAgreements.filter(a => a.approval_status === "Pending" && a.signature_url).length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">No pending approvals</p>
                  ) : (
                    <div className="space-y-4">
                      {allAgreements.filter(a => a.approval_status === "Pending" && a.signature_url).map(agr => {
                        const { title } = getPropDisplay(agr.property_id);
                        const profile = getProfile(agr.user_id);
                        return (
                          <div key={agr.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-muted/30 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">{title}</p>
                              <p className="text-sm text-muted-foreground">User: {profile?.display_name || agr.user_id.slice(0, 8)}</p>
                              {agr.signature_url && <img src={agr.signature_url} alt="Signature" className="h-12 mt-2 border border-border rounded" />}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApproveAgreement(agr.id)}><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectAgreement(agr.id)}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>All Agreements</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Property</TableHead><TableHead>User</TableHead><TableHead>Status</TableHead><TableHead>Signed</TableHead><TableHead>Date</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAgreements.map(agr => {
                        const { title } = getPropDisplay(agr.property_id);
                        const profile = getProfile(agr.user_id);
                        return (
                          <TableRow key={agr.id}>
                            <TableCell className="font-medium text-foreground">{title}</TableCell>
                            <TableCell className="text-muted-foreground">{profile?.display_name || agr.user_id.slice(0, 8)}</TableCell>
                            <TableCell><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${agr.approval_status === "Approved" ? "bg-emerald-500/10 text-emerald-600" : agr.approval_status === "Rejected" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>{agr.approval_status}</span></TableCell>
                            <TableCell>{agr.signature_url ? "✓" : "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{new Date(agr.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payments */}
          {activeTab === "payments" && (
            <div className="space-y-8">
              <Card>
                <CardHeader><CardTitle>Pending Confirmations ({pendingPayments})</CardTitle></CardHeader>
                <CardContent>
                  {allPayments.filter(p => p.status === "Pending").length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">No pending payments</p>
                  ) : (
                    <div className="space-y-4">
                      {allPayments.filter(p => p.status === "Pending").map(pay => {
                        const { title } = getPropDisplay(pay.property_id);
                        const profile = getProfile(pay.user_id);
                        return (
                          <div key={pay.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-muted/30 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">{title} — ${pay.amount?.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">By: {profile?.display_name || pay.user_id.slice(0, 8)} • {new Date(pay.payment_date).toLocaleDateString()}</p>
                              {pay.receipt_url && <a href={pay.receipt_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View Receipt</a>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleConfirmPayment(pay.id)}><CheckCircle2 className="w-4 h-4 mr-1" /> Confirm</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRejectPayment(pay.id)}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>All Payments</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Property</TableHead><TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPayments.map(pay => {
                        const { title } = getPropDisplay(pay.property_id);
                        const profile = getProfile(pay.user_id);
                        return (
                          <TableRow key={pay.id}>
                            <TableCell className="font-medium text-foreground">{title}</TableCell>
                            <TableCell className="text-muted-foreground">{profile?.display_name || pay.user_id.slice(0, 8)}</TableCell>
                            <TableCell className="font-semibold text-foreground">${pay.amount?.toLocaleString()}</TableCell>
                            <TableCell><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${pay.status === "Confirmed" ? "bg-emerald-500/10 text-emerald-600" : pay.status === "Rejected" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>{pay.status}</span></TableCell>
                            <TableCell className="text-muted-foreground">{new Date(pay.payment_date).toLocaleDateString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Activity */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              {activityLogs.length === 0 ? (
                <div className="text-center py-20">
                  <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No activity yet</h3>
                  <p className="text-muted-foreground">Platform activity will appear here</p>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>Details</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {activityLogs.map((log) => {
                          const profile = allProfiles.find((p) => p.id === log.user_id);
                          return (
                            <TableRow key={log.id}>
                              <TableCell><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{log.action}</span></TableCell>
                              <TableCell className="text-sm text-foreground">{profile?.display_name || log.user_id?.slice(0, 8) || "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <EnquiryDetailModal inquiry={selectedInquiry} open={!!selectedInquiry} onClose={() => setSelectedInquiry(null)} onStatusChange={fetchData} />
    </div>
  );
};

export default Admin;
