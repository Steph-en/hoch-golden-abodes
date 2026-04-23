import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Shield, ShieldCheck, ShieldOff, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const AdminRoles = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Confirmation dialog state
  const [pending, setPending] = useState<{
    target: UserRow;
    role: AppRole;
    action: "grant" | "revoke";
  } | null>(null);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Per-user role selector state
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const fetchAll = async () => {
    setLoading(true);
    const [usersRes, auditRes] = await Promise.all([
      (supabase as any).rpc("list_users_with_roles"),
      (supabase as any).from("role_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (usersRes.error) toast({ title: "Failed to load users", description: usersRes.error.message, variant: "destructive" });
    else setUsers(usersRes.data || []);
    if (!auditRes.error) setAudit(auditRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

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

  const adminCount = useMemo(() => users.filter((u) => u.roles.includes("admin")).length, [users]);

  const openConfirm = (target: UserRow, role: AppRole, action: "grant" | "revoke") => {
    setTypedConfirm("");
    setPending({ target, role, action });
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
    setSubmitting(false);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: pending.action === "grant" ? "Role granted" : "Role revoked",
      description: `${pending.role} ${pending.action === "grant" ? "→" : "✗"} ${pending.target.email}`,
    });
    setPending(null);
    fetchAll();
  };

  if (authLoading || adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" /> Role Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {users.length} users · {adminCount} admin{adminCount === 1 ? "" : "s"}
          </p>
        </div>

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
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.email}{isSelf && <span className="text-xs text-muted-foreground ml-2">(you)</span>}</TableCell>
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openConfirm(u, roleToUse, "revoke")}
                                disabled={isSelf && roleToUse === "admin"}
                                title={isSelf && roleToUse === "admin" ? "You cannot revoke your own admin role" : ""}
                              >
                                <ShieldOff className="w-4 h-4 mr-1" /> Revoke
                              </Button>
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
            <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Recent role changes</CardTitle>
          </CardHeader>
          <CardContent>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries yet.</p>
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
              <strong>{pending?.target.email}</strong>.
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
  );
};

export default AdminRoles;
