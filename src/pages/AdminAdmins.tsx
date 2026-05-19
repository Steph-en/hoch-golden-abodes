import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SuperAdminRoute from "../components/admin/SuperAdminRoute";

interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleString() : "Never";

const relativeTime = (d: string | null) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const AdminAdminsContent = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data, error } = await (supabase as any).rpc("list_admin_users");
      if (error) {
        toast({ title: "Failed to load admins", description: error.message, variant: "destructive" });
      } else {
        setAdmins(data || []);
      }
      setLoading(false);
    })();
  }, [isAdmin, toast]);

  if (authLoading || adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" /> Platform Administrators
          </h1>
          <p className="text-muted-foreground mt-1">
            {admins.length} admin{admins.length === 1 ? "" : "s"} have access to the platform.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All admin users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin inline" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Last sign-in</TableHead>
                    <TableHead>Member since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((a) => {
                    const isYou = a.user_id === user?.id;
                    return (
                      <TableRow key={a.user_id}>
                        <TableCell className="font-medium">
                          {a.email}
                          {isYou && (
                            <Badge variant="secondary" className="ml-2 text-xs">you</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.display_name || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{relativeTime(a.last_sign_in_at)}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              ({formatDate(a.last_sign_in_at)})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(a.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {admins.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No admins found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Wrapped with SuperAdminRoute guard
const AdminAdmins = () => (
  <SuperAdminRoute deniedMessage="The administrators list is restricted to Super Admin users only.">
    <AdminAdminsContent />
  </SuperAdminRoute>
);

export default AdminAdmins;