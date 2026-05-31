// send-booking-email: fires on booking_created, booking_confirmed, booking_cancelled
// Follows the same pattern as send-notification-email / send-role-change-email.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Hoch Online <noreply@hochonline.org>";

type BookingEmailType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled";

interface Body {
  type: BookingEmailType;
  guestEmail: string;
  guestName: string;
  propertyTitle: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  currency: string;
  bookingRef: string;
}

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${Number(day)} ${months[Number(m) - 1]} ${y}`;
};

const buildEmail = (b: Body) => {
  const gold = "#c8a15f";
  const header = (text: string) =>
    `<h2 style="margin:0 0 14px;font-size:22px;color:${gold};font-family:Georgia,serif;">${text}</h2>`;

  const summaryRow = (label: string, value: string) =>
    `<tr>
      <td style="padding:6px 0;color:#888;font-size:14px;">${label}</td>
      <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;text-align:right;">${value}</td>
    </tr>`;

  const summaryTable = `
    <table width="100%" style="border-collapse:collapse;margin:16px 0;">
      ${summaryRow("Property", b.propertyTitle)}
      ${summaryRow("Room", b.roomName)}
      ${summaryRow("Check-in", fmtDate(b.checkIn))}
      ${summaryRow("Check-out", fmtDate(b.checkOut))}
      ${summaryRow("Nights", String(b.nights))}
      ${summaryRow("Total", `${b.currency} ${Number(b.total).toLocaleString()}`)}
      ${summaryRow("Booking ref", `<span style="font-family:monospace">${b.bookingRef}</span>`)}
    </table>`;

  const footer = `<p style="margin-top:28px;color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:12px;">— Hoch Online Real Estate&nbsp;·&nbsp;<a href="https://www.hochonline.org" style="color:${gold};">hochonline.org</a></p>`;

  const wrap = (body: string) =>
    `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;background:#ffffff;color:#222;">${body}${footer}</div>`;

  switch (b.type) {
    case "booking_created":
      return {
        subject: `Booking confirmed — ${b.propertyTitle}`,
        html: wrap(`
          ${header("Your booking is confirmed")}
          <p>Hi ${b.guestName},</p>
          <p>Thank you for booking with Hoch Online. We have received your reservation and a member of our team will be in touch shortly to finalise the details.</p>
          ${summaryTable}
          <p style="font-size:13px;color:#666;background:#fafafa;padding:12px;border-radius:6px;">
            <strong>Payment:</strong> No charge today. Payment is due on arrival unless otherwise agreed. Secure online payment is coming soon.
          </p>
        `),
      };

    case "booking_confirmed":
      return {
        subject: `Great news — your stay at ${b.propertyTitle} is confirmed`,
        html: wrap(`
          ${header("Your stay is officially confirmed")}
          <p>Hi ${b.guestName},</p>
          <p>We are delighted to confirm your upcoming stay. Everything is set — we look forward to welcoming you.</p>
          ${summaryTable}
          <p style="font-size:13px;color:#666;background:#fafafa;padding:12px;border-radius:6px;">
            If you have any special requests or need directions, please reply to this email or contact us at
            <a href="mailto:info@hochonline.com" style="color:${gold};">info@hochonline.com</a>.
          </p>
        `),
      };

    case "booking_cancelled":
      return {
        subject: `Booking cancellation — ${b.propertyTitle}`,
        html: wrap(`
          ${header("Your booking has been cancelled")}
          <p>Hi ${b.guestName},</p>
          <p>We are writing to confirm that your booking has been cancelled as requested.</p>
          ${summaryTable}
          <p>We hope to welcome you on a future visit. Browse available stays at <a href="https://www.hochonline.org/stays" style="color:${gold};">hochonline.org/stays</a>.</p>
        `),
      };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body = (await req.json()) as Body;

    if (!body?.type || !body?.guestEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, guestEmail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = buildEmail(body);

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [body.guestEmail],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", res.status, data);
      return new Response(
        JSON.stringify({ error: "Email send failed", details: data }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-booking-email error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});