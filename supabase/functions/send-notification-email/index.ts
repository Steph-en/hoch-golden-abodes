import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

type NotificationType =
  | "agreement_created"
  | "agreement_approved"
  | "payment_confirmed"
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_updated"
  | "booking_payment_status";

interface RequestBody {
  type: NotificationType;
  to?: string;
  userId?: string;
  recipientName?: string;
  propertyTitle?: string;
  amount?: number;
  fromAddress?: string;
  // booking fields
  roomName?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests?: number;
  total?: number;
  currency?: string;
  status?: string;
  paymentStatus?: string;
}

const buildEmail = (b: RequestBody) => {
  const name = b.recipientName || "there";
  const property = b.propertyTitle || "your property";
  switch (b.type) {
    case "agreement_created":
      return {
        subject: `New agreement ready for ${property}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
          <h2 style="color:#c8a15f;margin:0 0 12px">A new agreement is ready</h2>
          <p>Hi ${name},</p>
          <p>An agreement has been created for <strong>${property}</strong>. Please sign in to your dashboard to review and sign it.</p>
          <p style="margin-top:24px;color:#888;font-size:13px">— Tropical Estates</p>
        </div>`,
      };
    case "agreement_approved":
      return {
        subject: `Agreement approved for ${property}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
          <h2 style="color:#c8a15f;margin:0 0 12px">Your agreement has been approved</h2>
          <p>Hi ${name},</p>
          <p>Great news — your agreement for <strong>${property}</strong> has been approved. An invoice has been generated and is available in your dashboard.</p>
          <p style="margin-top:24px;color:#888;font-size:13px">— Tropical Estates</p>
        </div>`,
      };
    case "payment_confirmed":
      return {
        subject: `Payment confirmed for ${property}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
          <h2 style="color:#c8a15f;margin:0 0 12px">Payment confirmed</h2>
          <p>Hi ${name},</p>
          <p>We've confirmed your payment${b.amount ? ` of <strong>$${b.amount.toLocaleString()}</strong>` : ""} for <strong>${property}</strong>. Your invoice balance has been updated.</p>
          <p style="margin-top:24px;color:#888;font-size:13px">— Hoch</p>
        </div>`,
      };
    case "booking_created":
    case "booking_confirmed":
    case "booking_cancelled":
    case "booking_updated":
    case "booking_payment_status": {
      const room = b.roomName || "your room";
      const dates = b.checkIn && b.checkOut ? `${b.checkIn} → ${b.checkOut}` : "";
      const totals = b.total ? `<p><strong>Total:</strong> ${b.currency || "USD"} ${Number(b.total).toLocaleString()}</p>` : "";
      const headlineMap: Record<string, string> = {
        booking_created: "We've received your booking",
        booking_confirmed: "Your booking is confirmed",
        booking_cancelled: "Your booking has been cancelled",
        booking_updated: "Your booking has been updated",
        booking_payment_status: "Payment status updated",
      };
      const subjMap: Record<string, string> = {
        booking_created: `Booking received — ${property}`,
        booking_confirmed: `Booking confirmed — ${property}`,
        booking_cancelled: `Booking cancelled — ${property}`,
        booking_updated: `Booking updated — ${property}`,
        booking_payment_status: `Payment ${b.paymentStatus || "updated"} — ${property}`,
      };
      return {
        subject: subjMap[b.type],
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
          <h2 style="color:#c8a15f;margin:0 0 12px">${headlineMap[b.type]}</h2>
          <p>Hi ${name},</p>
          <p><strong>${property}</strong>${room ? ` — ${room}` : ""}</p>
          ${dates ? `<p><strong>Stay:</strong> ${dates}${b.nights ? ` · ${b.nights} night(s)` : ""}${b.guests ? ` · ${b.guests} guest(s)` : ""}</p>` : ""}
          ${totals}
          ${b.status ? `<p><strong>Status:</strong> ${b.status}</p>` : ""}
          ${b.paymentStatus ? `<p><strong>Payment:</strong> ${b.paymentStatus}</p>` : ""}
          <p style="margin-top:20px">You can view this booking anytime in your dashboard.</p>
          <p style="margin-top:24px;color:#888;font-size:13px">— Hoch</p>
        </div>`,
      };
    }
  }
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

    const body = (await req.json()) as RequestBody;
    if (!body?.type) {
      return new Response(JSON.stringify({ error: "Missing 'type'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let to = body.to;
    if (!to && body.userId) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data, error } = await admin.auth.admin.getUserById(body.userId);
      if (error) console.error("getUserById error:", error);
      to = data?.user?.email || undefined;
    }

    if (!to) {
      return new Response(JSON.stringify({ error: "No recipient email available" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = buildEmail(body);
    const from = body.fromAddress || "Hoch <noreply@hochonline.org>";

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
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
    console.error("send-notification-email error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
