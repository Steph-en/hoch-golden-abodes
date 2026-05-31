// Handles all agreement lifecycle email notifications
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL  = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Hoch Online <noreply@hochonline.org>";
const GOLD         = "#c8a15f";
const SITE_URL     = "https://www.hochonline.org";

type AgreementEmailType =
  | "agreement_created"
  | "agreement_uploaded"
  | "agreement_under_review"
  | "agreement_verified"
  | "agreement_rejected"
  | "agreement_archived";

interface Body {
  type: AgreementEmailType;
  /** Recipient user ID — used to look up email when `to` is absent */
  userId?: string;
  /** Explicit recipient email (overrides userId lookup) */
  to?: string;
  recipientName?: string;
  propertyTitle?: string;
  verificationNotes?: string;
  agreementId?: string;
  dashboardUrl?: string;
}

// ── Email builders ────────────────────────────────────────────────────────────

const wrap = (inner: string) => `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;background:#ffffff;color:#222;">
  ${inner}
  <p style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;color:#aaa;font-size:12px;">
    — Hoch Online Real Estate &nbsp;·&nbsp;
    <a href="${SITE_URL}" style="color:${GOLD};text-decoration:none;">${SITE_URL}</a>
  </p>
</div>`.trim();

const h2 = (text: string) =>
  `<h2 style="margin:0 0 16px;font-size:22px;color:${GOLD};font-family:Georgia,serif;">${text}</h2>`;

const p  = (text: string) => `<p style="margin:0 0 12px;line-height:1.6;">${text}</p>`;

const btn = (label: string, url: string) =>
  `<a href="${url}" style="display:inline-block;margin-top:8px;padding:12px 28px;background:${GOLD};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${label}</a>`;

const noteBox = (text: string) =>
  `<div style="margin:16px 0;padding:12px 16px;background:#fff8f0;border-left:3px solid ${GOLD};border-radius:4px;font-size:13px;color:#555;">${text}</div>`;

const buildEmail = (b: Body): { subject: string; html: string } => {
  const name     = b.recipientName ?? "there";
  const property = b.propertyTitle ?? "your property";
  const dashboard = b.dashboardUrl ?? `${SITE_URL}/dashboard`;
  const adminUrl  = `${SITE_URL}/admin`;

  switch (b.type) {
    // ── Created ─────────────────────────────────────────────────────────────
    case "agreement_created":
      return {
        subject: `Your agreement is ready — ${property}`,
        html: wrap(`
          ${h2("Your agreement is ready for signature")}
          ${p(`Hi ${name},`)}
          ${p(`An agreement has been prepared for <strong>${property}</strong>. Please follow the steps below to complete the signing process:`)}
          <ol style="margin:16px 0;padding-left:20px;line-height:2;">
            <li>Open your dashboard and go to the <strong>Agreements</strong> tab</li>
            <li>Download the original agreement document</li>
            <li>Print, sign, and scan or photograph the signed document</li>
            <li>Upload the signed copy back through your dashboard</li>
          </ol>
          ${btn("Go to My Agreements", dashboard)}
          ${p(`<span style="font-size:13px;color:#888;">If you have any questions, please don't hesitate to contact us.</span>`)}
        `),
      };

    // ── Uploaded (admin notification) ────────────────────────────────────────
    case "agreement_uploaded":
      return {
        subject: `Signed agreement uploaded — review required`,
        html: wrap(`
          ${h2("Signed agreement received")}
          ${p(`A client has uploaded a signed agreement document for <strong>${property}</strong> and it is awaiting your review.`)}
          ${p(`Please open the agreement in the admin panel to inspect the document and verify or reject the submission.`)}
          ${btn("Review in Admin Panel", adminUrl)}
        `),
      };

    // ── Under review ─────────────────────────────────────────────────────────
    case "agreement_under_review":
      return {
        subject: `Agreement under review — ${property}`,
        html: wrap(`
          ${h2("Your agreement is being reviewed")}
          ${p(`Hi ${name},`)}
          ${p(`Your signed agreement for <strong>${property}</strong> is currently being reviewed by our team. We will notify you as soon as the review is complete.`)}
          ${p(`This typically takes 1–2 business days.`)}
          ${btn("View Agreement Status", dashboard)}
        `),
      };

    // ── Verified ─────────────────────────────────────────────────────────────
    case "agreement_verified":
      return {
        subject: `✓ Agreement approved — ${property}`,
        html: wrap(`
          ${h2("Your agreement has been approved")}
          ${p(`Hi ${name},`)}
          ${p(`We are pleased to confirm that your signed agreement for <strong>${property}</strong> has been <strong style="color:#16a34a;">verified and approved</strong>.`)}
          ${p(`Your agreement is now on record. You can access and download a copy from your dashboard at any time for future reference.`)}
          ${btn("View My Agreement", dashboard)}
          ${p(`<span style="font-size:13px;color:#888;">This agreement will remain accessible in your account indefinitely.</span>`)}
        `),
      };

    // ── Rejected ─────────────────────────────────────────────────────────────
    case "agreement_rejected":
      return {
        subject: `Action required — Agreement resubmission needed`,
        html: wrap(`
          ${h2("Agreement submission not accepted")}
          ${p(`Hi ${name},`)}
          ${p(`Unfortunately, your signed agreement submission for <strong>${property}</strong> was not accepted.`)}
          ${b.verificationNotes
            ? noteBox(`<strong>Reason:</strong> ${b.verificationNotes}`)
            : noteBox("Please contact us for further details.")}
          ${p(`To proceed, please download the original agreement again, sign it clearly, and upload a corrected version through your dashboard.`)}
          ${btn("Resubmit Agreement", dashboard)}
          ${p(`<span style="font-size:13px;color:#888;">If you believe this is an error or need assistance, please get in touch with our team.</span>`)}
        `),
      };

    // ── Archived ─────────────────────────────────────────────────────────────
    case "agreement_archived":
      return {
        subject: `Agreement archived — ${property}`,
        html: wrap(`
          ${h2("Agreement archived")}
          ${p(`Hi ${name},`)}
          ${p(`Your agreement for <strong>${property}</strong> has been archived. You can still access and download the document from your dashboard at any time.`)}
          ${btn("View in Dashboard", dashboard)}
        `),
      };
  }
};

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");
    if (!RESEND_API_KEY)  throw new Error("RESEND_API_KEY not set");

    const body = (await req.json()) as Body;

    if (!body?.type) {
      return new Response(JSON.stringify({ error: "Missing 'type'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipient email
    let to = body.to;
    if (!to && body.userId) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data } = await admin.auth.admin.getUserById(body.userId);
      to = data?.user?.email ?? undefined;
    }

    if (!to) {
      return new Response(JSON.stringify({ error: "No recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = buildEmail(body);

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", res.status, data);
      return new Response(
        JSON.stringify({ error: "Email send failed", details: data }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-agreement-email error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});