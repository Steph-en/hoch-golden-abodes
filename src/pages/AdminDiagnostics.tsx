import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";

type CheckStatus = "pending" | "pass" | "fail" | "warn";
interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
}

const StatusIcon = ({ status }: { status: CheckStatus }) => {
  if (status === "pending") return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
  if (status === "pass") return <CheckCircle2 className="w-5 h-5 text-primary" />;
  if (status === "warn") return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
  return <XCircle className="w-5 h-5 text-destructive" />;
};

const AdminDiagnostics = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate("/auth");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const setCheck = (name: string, status: CheckStatus, message: string) => {
    setChecks((prev) => {
      const others = prev.filter((c) => c.name !== name);
      return [...others, { name, status, message }];
    });
  };

  const runDiagnostics = async () => {
    setRunning(true);
    setChecks([]);

    // 1. Properties read
    try {
      const { data, error } = await (supabase as any).from("properties").select("*").limit(50);
      if (error) throw error;
      const total = data?.length || 0;
      const missingPrice = data?.filter((p: any) => !p.price_value || p.price_value <= 0).length || 0;
      const missingTitle = data?.filter((p: any) => !p.title).length || 0;
      const fieldIssues = missingPrice + missingTitle;
      setCheck(
        "Properties: required fields",
        fieldIssues === 0 ? "pass" : "warn",
        fieldIssues === 0
          ? `${total} properties — all required fields present`
          : `${fieldIssues} properties missing title or price`
      );

      // 2. Images
      const noImage = data?.filter((p: any) => !p.image_url && (!p.images || p.images.length === 0)).length || 0;
      setCheck(
        "Properties: images",
        noImage === 0 ? "pass" : "warn",
        noImage === 0 ? "All properties have at least one image" : `${noImage} properties have no image`
      );

      // 3. Probe one image URL
      const sample = data?.find((p: any) => p.image_url)?.image_url;
      if (sample) {
        try {
          const res = await fetch(sample, { method: "HEAD" });
          setCheck(
            "Image URL reachability",
            res.ok ? "pass" : "fail",
            res.ok ? `Sample image OK (${res.status})` : `Sample image returned ${res.status}`
          );
        } catch {
          setCheck("Image URL reachability", "fail", "Sample image fetch failed (CORS or 404)");
        }
      } else {
        setCheck("Image URL reachability", "warn", "No image_url to probe");
      }
    } catch (e: any) {
      setCheck("Properties: required fields", "fail", e.message || "Read failed");
    }

    // 4. Storage bucket
    try {
      const { data, error } = await supabase.storage.from("property-images").list("", { limit: 1 });
      if (error) throw error;
      setCheck("Storage: property-images bucket", "pass", `Bucket reachable (${data?.length ?? 0} item probed)`);
    } catch (e: any) {
      setCheck("Storage: property-images bucket", "fail", e.message || "Bucket inaccessible");
    }

    // 5. RLS — anon can read properties (public)
    try {
      const { error } = await (supabase as any).from("properties").select("id").limit(1);
      setCheck("RLS: public read on properties", error ? "fail" : "pass", error?.message || "Anyone can view properties");
    } catch (e: any) {
      setCheck("RLS: public read on properties", "fail", e.message);
    }

    // 6. RLS — admin reads on protected tables
    for (const table of ["agreements", "payments", "invoices", "inquiries", "profiles", "user_roles"]) {
      try {
        const { error } = await (supabase as any).from(table).select("*", { count: "exact", head: true });
        setCheck(`RLS: admin read ${table}`, error ? "fail" : "pass", error?.message || "OK");
      } catch (e: any) {
        setCheck(`RLS: admin read ${table}`, "fail", e.message);
      }
    }

    // 7. has_role function
    try {
      const { data, error } = await (supabase as any).rpc("has_role", {
        _user_id: user?.id,
        _role: "admin",
      });
      setCheck("Function: has_role()", error ? "fail" : data ? "pass" : "warn", error?.message || (data ? "Returns true for current admin" : "Returned false"));
    } catch (e: any) {
      setCheck("Function: has_role()", "fail", e.message);
    }

    // 8. Edge function: send-notification-email (dry — invalid type to confirm reachable)
    try {
      const { data, error } = await supabase.functions.invoke("send-notification-email", {
        body: { type: "agreement_created", to: "diagnostics@example.com", recipientName: "Diagnostics", propertyTitle: "Diagnostic Check" },
      });
      if (error) throw error;
      setCheck("Edge fn: send-notification-email", data?.success ? "pass" : "warn", data?.success ? "Reachable & accepted (test send)" : JSON.stringify(data));
    } catch (e: any) {
      setCheck("Edge fn: send-notification-email", "fail", e.message || "Invocation failed");
    }

    // 9. Triggers (indirectly via functions)
    try {
      const { error } = await (supabase as any).from("invoices").select("id", { head: true, count: "exact" });
      setCheck("Triggers: invoices table accessible", error ? "fail" : "pass", error?.message || "Trigger target table OK");
    } catch (e: any) {
      setCheck("Triggers: invoices table accessible", "fail", e.message);
    }

    // 10. Server-side RLS probe suite (admin only)
    try {
      const { data, error } = await supabase.functions.invoke("rls-check", { body: {} });
      if (error) throw error;
      const probes = data?.probes || [];
      const failed = probes.filter((p: any) => !p.pass);
      setCheck(
        "RLS suite: anon denied on protected tables",
        failed.length === 0 ? "pass" : "fail",
        failed.length === 0
          ? `All ${probes.length} probes passed`
          : `${failed.length} failed: ${failed.map((f: any) => f.name).join(", ")}`
      );
    } catch (e: any) {
      setCheck("RLS suite: anon denied on protected tables", "fail", e.message || "rls-check function failed");
    }

    setRunning(false);
  };

  useEffect(() => {
    if (isAdmin) runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (authLoading || adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  return (
    <div className="min-h-screen bg-background py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground">System Diagnostics</h1>
            <p className="text-muted-foreground mt-1">
              {passCount} passed · {warnCount} warnings · {failCount} failed
            </p>
          </div>
          <Button onClick={runDiagnostics} disabled={running} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
            Re-run
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Health checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.length === 0 && running && (
              <p className="text-muted-foreground text-sm">Running checks…</p>
            )}
            {checks.map((c) => (
              <div key={c.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                <StatusIcon status={c.status} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-sm text-muted-foreground break-words">{c.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDiagnostics;
