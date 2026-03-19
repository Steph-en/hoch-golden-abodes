import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, Activity, Shield, Search, Filter,
  ChevronDown, Eye, Clock, CheckCircle2, TrendingUp, UserPlus, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { properties } from "@/data/properties";
import EnquiryDetailModal from "@/components/EnquiryDetailModal";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "enquiries" | "activity">("overview");
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [allInquiries, setAllInquiries] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);

  // Filters
  const [userSearch, setUserSearch] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");
  const [inquiryPropertyFilter, setInquiryPropertyFilter] = useState("all");

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

  const fetchData = async () => {
    const [profilesRes, inquiriesRes, activityRes] = await Promise.all([
      (supabase as any).from("profiles").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("inquiries").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setAllProfiles(profilesRes.data || []);
    setAllInquiries(inquiriesRes.data || []);
    setActivityLogs(activityRes.data || []);
  };

  if (authLoading || adminLoading || !isAdmin) return null;

  // Stats
  const totalUsers = allProfiles.length;
  const totalInquiries = allInquiries.length;
  const pendingInquiries = allInquiries.filter((i) => i.status === "pending").length;
  const recentRegistrations = allProfiles.filter(
    (p) => new Date(p.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  // Filtered data
  const filteredUsers = allProfiles.filter((p) =>
    !userSearch || (p.display_name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    p.id.includes(userSearch)
  );

  const filteredInquiries = allInquiries.filter((i) => {
    if (inquiryStatusFilter !== "all" && i.status !== inquiryStatusFilter) return false;
    if (inquiryPropertyFilter !== "all" && String(i.property_id) !== inquiryPropertyFilter) return false;
    return true;
  });

  // Most enquired properties
  const propertyCounts: Record<number, number> = {};
  allInquiries.forEach((i) => {
    if (i.property_id) propertyCounts[i.property_id] = (propertyCounts[i.property_id] || 0) + 1;
  });
  const topProperties = Object.entries(propertyCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([id, count]) => ({ property: properties.find((p) => p.id === Number(id)), count }));

  // User inquiry counts
  const userInquiryCounts: Record<string, number> = {};
  allInquiries.forEach((i) => {
    if (i.user_id) userInquiryCounts[i.user_id] = (userInquiryCounts[i.user_id] || 0) + 1;
  });

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "enquiries" as const, label: "Enquiries", icon: MessageSquare },
    { id: "activity" as const, label: "Activity", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">Manage users, enquiries, and platform activity</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-10 border-b border-border pb-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-display font-semibold text-foreground">{totalUsers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10"><MessageSquare className="w-5 h-5 text-primary" /></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Enquiries</p>
                        <p className="text-2xl font-display font-semibold text-foreground">{totalInquiries}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-amber-500/10"><Clock className="w-5 h-5 text-amber-500" /></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-display font-semibold text-foreground">{pendingInquiries}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-500/10"><UserPlus className="w-5 h-5 text-emerald-500" /></div>
                      <div>
                        <p className="text-sm text-muted-foreground">New This Week</p>
                        <p className="text-2xl font-display font-semibold text-foreground">{recentRegistrations}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top enquired properties */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Most Enquired Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topProperties.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No enquiries yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topProperties.map(({ property: prop, count }, i) => prop && (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                          <img src={prop.image} alt={prop.title} className="w-14 h-14 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{prop.title}</p>
                            <p className="text-sm text-muted-foreground">{prop.location}</p>
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
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Enquiries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{profile.display_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{profile.id.slice(0, 8)}...</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{profile.phone || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(profile.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {userInquiryCounts[profile.id] || 0}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
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
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={inquiryPropertyFilter} onValueChange={setInquiryPropertyFilter}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInquiries.map((inquiry) => {
                        const prop = properties.find((p) => p.id === inquiry.property_id);
                        return (
                          <TableRow key={inquiry.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {prop && <img src={prop.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                                <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                                  {prop?.title || "General"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-foreground">{inquiry.name}</p>
                                <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="text-sm text-muted-foreground truncate">{inquiry.message}</p>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                inquiry.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                                inquiry.status === "responded" ? "bg-emerald-500/10 text-emerald-600" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {inquiry.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(inquiry.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedInquiry(inquiry)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredInquiries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            No enquiries found
                          </TableCell>
                        </TableRow>
                      )}
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
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogs.map((log) => {
                          const profile = allProfiles.find((p) => p.id === log.user_id);
                          return (
                            <TableRow key={log.id}>
                              <TableCell>
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                  {log.action}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-foreground">
                                {profile?.display_name || log.user_id?.slice(0, 8) || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(log.created_at).toLocaleString()}
                              </TableCell>
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

      <EnquiryDetailModal
        inquiry={selectedInquiry}
        open={!!selectedInquiry}
        onClose={() => setSelectedInquiry(null)}
        onStatusChange={fetchData}
      />
    </div>
  );
};

export default Admin;
