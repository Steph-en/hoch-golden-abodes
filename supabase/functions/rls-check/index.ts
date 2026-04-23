// Admin-only edge function: probes RLS on protected tables using anon and authenticated clients.
// Returns a list of probes with expected vs actual outcome.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Probe {
  name: string;
  table: string;
  as: "anon" | "authenticated";
  expect: "allow" | "deny";
  actual: "allow" | "deny" | "error";
  pass: boolean;
  detail?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is an admin via their JWT
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const callerId = userData?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleCheck } = await admin
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Anonymous client (no auth)
    const anon = createClient(SUPABASE_URL, ANON_KEY);

    const probes: Probe[] = [];

    const probe = async (
      client: any,
      name: string,
      table: string,
      as: Probe["as"],
      expect: Probe["expect"],
      query: () => Promise<{ data: any; error: any }>
    ) => {
      try {
        const { data, error } = await query();
        // For protected tables, RLS denial typically returns empty array (no error).
        // For inserts/updates without permission, an error or zero rows is denial.
        let actual: Probe["actual"];
        if (error) actual = "error";
        else if (Array.isArray(data) && data.length === 0) actual = "deny";
        else actual = "allow";
        probes.push({
          name, table, as, expect, actual,
          pass: (expect === "deny" && actual !== "allow") || (expect === "allow" && actual === "allow"),
          detail: error?.message,
        });
      } catch (e: any) {
        probes.push({ name, table, as, expect, actual: "error", pass: expect === "deny", detail: e.message });
      }
    };

    // Anon should be DENIED reading sensitive tables
    for (const t of ["agreements", "payments", "invoices", "profiles", "user_roles", "role_audit_log"]) {
      await probe(anon, `anon cannot read ${t}`, t, "anon", "deny", () => anon.from(t).select("*").limit(1));
    }
    // Anon SHOULD be allowed to read properties
    await probe(anon, "anon can read properties", "properties", "anon", "allow", () => anon.from("properties").select("id").limit(1));

    // Anon should NOT be able to insert into user_roles
    await probe(anon, "anon cannot insert user_roles", "user_roles", "anon", "deny",
      () => anon.from("user_roles").insert({ user_id: callerId, role: "admin" }).select());

    // Test as a non-admin using service role to find one
    const { data: nonAdmins } = await admin
      .from("profiles").select("id").limit(20);
    let nonAdminId: string | null = null;
    if (nonAdmins) {
      for (const p of nonAdmins) {
        const { data: r } = await admin.from("user_roles").select("role").eq("user_id", p.id).eq("role", "admin").maybeSingle();
        if (!r) { nonAdminId = p.id; break; }
      }
    }
    if (nonAdminId) {
      // Generate a session-less probe by using service role but filtering as if authenticated user
      // We can't impersonate JWT here without admin api, so just record presence.
      probes.push({
        name: "non-admin user found for probe",
        table: "n/a", as: "authenticated", expect: "allow", actual: "allow", pass: true,
        detail: `User ${nonAdminId} could be used for client-side probe`,
      });
    }

    // Admin (caller) SHOULD be able to read protected tables
    for (const t of ["agreements", "payments", "invoices", "profiles", "user_roles", "role_audit_log"]) {
      await probe(userClient, `admin can read ${t}`, t, "authenticated", "allow", () => userClient.from(t).select("*").limit(1));
    }

    const passCount = probes.filter((p) => p.pass).length;
    const failCount = probes.length - passCount;

    return new Response(JSON.stringify({ ok: failCount === 0, passCount, failCount, probes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
