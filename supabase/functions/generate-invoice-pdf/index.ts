import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch property
    const { data: property } = await supabase
      .from("properties")
      .select("title, location, price")
      .eq("id", invoice.property_id)
      .single();

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", invoice.user_id)
      .single();

    // Fetch confirmed payments
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, payment_date, status")
      .eq("user_id", invoice.user_id)
      .eq("property_id", invoice.property_id)
      .eq("status", "Confirmed")
      .order("payment_date", { ascending: true });

    const userName = profile?.display_name || "Customer";
    const propertyTitle = property?.title || `Property #${invoice.property_id}`;
    const propertyLocation = property?.location || "";
    const propertyPrice = property?.price || `$${invoice.total_amount.toLocaleString()}`;
    const invoiceDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Generate HTML invoice
    const paymentRows = (payments || []).map((p: any, i: number) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${new Date(p.payment_date).toLocaleDateString()}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${p.amount.toLocaleString()}</td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice</title></head>
<body style="font-family:Arial,sans-serif;margin:0;padding:40px;color:#1a1a1a;">
  <div style="max-width:700px;margin:0 auto;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;">
      <div>
        <h1 style="margin:0;font-size:28px;color:#0f172a;">INVOICE</h1>
        <p style="color:#64748b;margin:4px 0;">Invoice #${invoice.id.slice(0, 8).toUpperCase()}</p>
        <p style="color:#64748b;margin:4px 0;">Date: ${invoiceDate}</p>
      </div>
      <div style="text-align:right;">
        <h2 style="margin:0;font-size:18px;color:#0f172a;">LuxeRealty</h2>
        <p style="color:#64748b;margin:4px 0;font-size:13px;">Premium Real Estate</p>
      </div>
    </div>

    <div style="display:flex;gap:40px;margin-bottom:32px;">
      <div>
        <h3 style="font-size:12px;text-transform:uppercase;color:#64748b;margin:0 0 8px;">Bill To</h3>
        <p style="margin:0;font-weight:600;">${userName}</p>
        <p style="margin:2px 0;color:#64748b;font-size:14px;">${profile?.phone || ""}</p>
      </div>
      <div>
        <h3 style="font-size:12px;text-transform:uppercase;color:#64748b;margin:0 0 8px;">Property</h3>
        <p style="margin:0;font-weight:600;">${propertyTitle}</p>
        <p style="margin:2px 0;color:#64748b;font-size:14px;">${propertyLocation}</p>
        <p style="margin:2px 0;color:#64748b;font-size:14px;">Price: ${propertyPrice}</p>
      </div>
    </div>

    <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:32px;">
      <div style="display:flex;justify-content:space-between;">
        <div style="text-align:center;flex:1;">
          <p style="font-size:12px;text-transform:uppercase;color:#64748b;margin:0 0 4px;">Total Amount</p>
          <p style="font-size:22px;font-weight:700;margin:0;color:#0f172a;">$${invoice.total_amount.toLocaleString()}</p>
        </div>
        <div style="text-align:center;flex:1;">
          <p style="font-size:12px;text-transform:uppercase;color:#64748b;margin:0 0 4px;">Amount Paid</p>
          <p style="font-size:22px;font-weight:700;margin:0;color:#16a34a;">$${invoice.amount_paid.toLocaleString()}</p>
        </div>
        <div style="text-align:center;flex:1;">
          <p style="font-size:12px;text-transform:uppercase;color:#64748b;margin:0 0 4px;">Balance Due</p>
          <p style="font-size:22px;font-weight:700;margin:0;color:#ea580c;">$${invoice.balance.toLocaleString()}</p>
        </div>
      </div>
    </div>

    <h3 style="font-size:16px;margin:0 0 12px;color:#0f172a;">Payment History</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;">#</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;">Date</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${paymentRows || '<tr><td colspan="3" style="padding:16px;text-align:center;color:#94a3b8;">No payments recorded</td></tr>'}
      </tbody>
    </table>

    <div style="border-top:2px solid #e5e7eb;padding-top:20px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">This is a computer-generated invoice. Generated on ${invoiceDate}.</p>
    </div>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ html, invoice, property: { title: propertyTitle, location: propertyLocation } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
