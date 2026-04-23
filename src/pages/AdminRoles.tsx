import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Loader2, Search, Shield, ShieldCheck, ShieldOff, History, AlertTriangle, FilterX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AppRole = "admin" | "moderator" | "user";
interface UserRow {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  roles: AppRole[];
}
interface AuditRow {
  id: string;
  target_email: string | null;
  role: AppRole;
  action: "granted" | "revoked";
  performed_by_email: string | null;
  created_at: string;
}

const ROLES: AppRole[] = ["admin", "moderator", "user"];
type ActionFilter = "all" | "granted" | "revoked";
type RoleFilter = "all" | AppRole;

const AdminRoles = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [adminCount, setAdminCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Audit filters
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Confirmation
  const [pending, setPending] = useState<{
    target: UserRow;
    role: AppRole;
    action: "grant" | "revoke";
  } | null>(null);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const fetchUsers = async () => {
    const [usersRes, countRes] = await Promise.all([
      (supabase as any).rpc("list_users_with_roles"),
      (supabase as any).rpc("get_admin_count"),
    ]);
    if (usersRes.error) {
      toast({ title: "Failed to load users", description: usersRes.error.message, variant: "destructive" });
    } else {
      setUsers(usersRes.data || []);
    }
    if (!countRes.error && typeof countRes.data === "number") {
      setAdminCount(countRes.data);
    }
  };

  const fetchAudit = async () => {
    setAuditLoading(true);
    const { data, error } = await (supabase as any).rpc("list_role_audit_log", {
      _action: actionFilter === "all" ? null : actionFilter,
      _role: roleFilter === "all" ? null : roleFilter,
      _from: fromDate ? new Date(fromDate).toISOString() : null,
      _to: toDate ? new Date(toDate + "T23:59:59").toISOString() : null,
      _limit: 100,
    });
    if (error) {
      toast({ title: "Failed to load audit log", description: error.message, variant: "destructive" });
    } else {
      setAudit(data || []);
    }
    setAuditLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchAudit()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Refetch audit when filters change
  useEffect(() => {
    if (isAdmin && !loading) fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, roleFilter, fromDate, toDate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q)
    );
  }, [users, search]);

  const isLastAdmin = adminCount <= 1;

  const openConfirm = (target: UserRow, role: AppRole, action: "grant" | "revoke") => {
    // Block last-admin revoke client-side with a toast (server also blocks it)
    if (action === "revoke" && role === "admin" && isLastAdmin) {
      toast({
        title: "Action blocked",
        description: "This is the only admin on the platform. Grant the admin role to another user before revoking this one.",
        variant: "destructive",
      });
      return;
    }
    if (action === "revoke" && role === "admin" && target.user_id === user?.id) {
      toast({
        title: "Action blocked",
        description: "You cannot revoke your own admin role. Ask another admin to do this.",
        variant: "destructive",
      });
      return;
    }
    setTypedConfirm("");
    setPending({ target, role, action });
  };

  const sendNotificationEmail = async (
    targetUserId: string,
    role: AppRole,
    action: "granted" | "revoked"
  ) => {
    try {
      const { error } = await supabase.functions.invoke("send-role-change-email", {
        body: {
          action,
          role,
          targetUserId,
          performedByEmail: user?.email,
        },
      });
      if (error) console.warn("Notification email failed:", error.message);
    } catch (e) {
      console.warn("Notification email error:", e);
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    if (typedConfirm.trim().toLowerCase() !== pending.target.email.toLowerCase()) {
      toast({ title: "Email confirmation does not match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const fn = pending.action === "grant" ? "assign_role" : "revoke_role";
    const { error } = await (supabase as any).rpc(fn, {
      _target_user_id: pending.target.user_id,
      _role: pending.role,
    });
    if (error) {
      setSubmitting(false);
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }

    // Fire-and-forget email
    await sendNotificationEmail(
      pending.target.user_id,
      pending.role,
      pending.action === "grant" ? "granted" : "revoked"
    );

    setSubmitting(false);
    toast({
      title: pending.action === "grant" ? "Role granted" : "Role revoked",
      description: `${pending.role} ${pending.action === "grant" ? "→" : "✗"} ${pending.target.email} (notification email sent)`,
    });
    setPending(null);
    await Promise.all([fetchUsers(), fetchAudit()]);
  };

  const clearAuditFilters = () => {
    setActionFilter("all");
    setRoleFilter("all");
    setFromDate("");
    setToDate("");
  };

  if (authLoading || adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-7 h-7 text-primary" /> Role Management
              </h1>
              <p className="text-muted-foreground mt-1">
                {users.length} users · <strong>{adminCount}</strong> admin{adminCount === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/admin/admins">View admins</Link>
            </Button>
          </div>

          {isLastAdmin && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Only one admin remains</AlertTitle>
              <AlertDescription>
                There is currently <strong>{adminCount}</strong> admin on the platform. Removing this admin would leave the system with no administrators, so the revoke action is blocked. Grant the admin role to another user before attempting to revoke this one.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email, name, or user ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loading ? (
                <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => {
                      const isSelf = u.user_id === user?.id;
                      const roleToUse = selectedRole[u.user_id] || "admin";
                      const hasRole = u.roles.includes(roleToUse);
                      const blockSelfAdmin = isSelf && roleToUse === "admin";
                      const blockLastAdmin =
                        roleToUse === "admin" && hasRole && isLastAdmin;
                      const revokeBlocked = blockSelfAdmin || blockLastAdmin;
                      const blockReason = blockLastAdmin
                        ? "Cannot revoke the last admin on the platform"
                        : blockSelfAdmin
                        ? "You cannot revoke your own admin role"
                        : "";
                      return (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">
                            {u.email}
                            {isSelf && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.display_name || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {u.roles.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                              {u.roles.map((r) => (
                                <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end items-center">
                              <Select
                                value={roleToUse}
                                onValueChange={(v) => setSelectedRole((s) => ({ ...s, [u.user_id]: v as AppRole }))}
                              >
                                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              {hasRole ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span tabIndex={revokeBlocked ? 0 : -1}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openConfirm(u, roleToUse, "revoke")}
                                        disabled={revokeBlocked}
                                      >
                                        <ShieldOff className="w-4 h-4 mr-1" /> Revoke
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {blockReason && (
                                    <TooltipContent>{blockReason}</TooltipContent>
                                  )}
                                </Tooltip>
                              ) : (
                                <Button size="sm" onClick={() => openConfirm(u, roleToUse, "grant")}>
                                  <ShieldCheck className="w-4 h-4 mr-1" /> Grant
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users match.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" /> Audit log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Action</label>
                  <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as ActionFilter)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      <SelectItem value="granted">Granted</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearAuditFilters} className="h-9 w-full">
                    <FilterX className="w-4 h-4 mr-1" /> Clear filters
                  </Button>
                </div>
              </div>

              {auditLoading ? (
                <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
              ) : audit.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No audit entries match these filters.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={a.action === "granted" ? "default" : "destructive"}>{a.action}</Badge>
                        </TableCell>
                        <TableCell>{a.role}</TableCell>
                        <TableCell>{a.target_email || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{a.performed_by_email || "system"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pending?.action === "grant" ? "Grant role" : "Revoke role"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to <strong>{pending?.action}</strong> the <strong>{pending?.role}</strong> role
                {pending?.action === "grant" ? " to " : " from "}
                <strong>{pending?.target.email}</strong>. The user will receive an email notification.
                <br /><br />
                Type the user's email to confirm:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder={pending?.target.email}
              autoFocus
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default AdminRoles;
