import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Hoch <noreply@hochonline.org>";

interface Body {
  action: "granted" | "revoked";
  role: "admin" | "moderator" | "user";
  targetUserId: string;
  performedByEmail?: string;
}

const buildEmail = (b: Body, recipientName: string) => {
  const verb = b.action === "granted" ? "granted" : "revoked";
  const roleLabel = b.role.charAt(0).toUpperCase() + b.role.slice(1);
  const headline =
    b.action === "granted"
      ? `You have been granted the ${roleLabel} role`
      : `Your ${roleLabel} role has been revoked`;
  const body =
    b.action === "granted"
      ? `You now have the <strong>${roleLabel}</strong> role on Tropical Estates. Sign in to your dashboard to access the new permissions.`
      : `Your <strong>${roleLabel}</strong> role on Tropical Estates has been revoked. Some features may no longer be available to your account.`;

  const by = b.performedByEmail
    ? `<p style="font-size:13px;color:#888;margin-top:16px">Performed by: ${b.performedByEmail}</p>`
    : "";

  return {
    subject: headline,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;background:#ffffff">
      <h2 style="color:#c8a15f;margin:0 0 12px">${headline}</h2>
      <p>Hi ${recipientName || "there"},</p>
      <p>${body}</p>
      <p style="font-size:13px;color:#666">Action: <strong>${verb}</strong> · Role: <strong>${roleLabel}</strong></p>
      ${by}
      <p style="margin-top:28px;color:#888;font-size:13px">— Tropical Estates</p>
    </div>`,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body = (await req.json()) as Body;
    if (!body?.action || !body?.role || !body?.targetUserId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is an admin (defense in depth)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up recipient using service role
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: target, error: targetErr } = await admin.auth.admin.getUserById(body.targetUserId);
    if (targetErr || !target?.user?.email) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", body.targetUserId)
      .maybeSingle();

    const { subject, html } = buildEmail(body, profile?.display_name || "");

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [target.user.email],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", res.status, data);
      return new Response(
        JSON.stringify({ error: "Email send failed", details: data }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-role-change-email error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
