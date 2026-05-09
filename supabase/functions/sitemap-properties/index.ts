import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://www.hochonline.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: props, error: pErr }, { data: rooms, error: rErr }] = await Promise.all([
      supabase.from("properties").select("id, updated_at, listing_kind").order("updated_at", { ascending: false }).limit(5000),
      supabase.from("rooms").select("id, property_id, updated_at").eq("status", "active").limit(5000),
    ]);
    if (pErr) throw pErr;
    if (rErr) throw rErr;

    const propUrls = (props ?? []).map((p: any) => {
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString();
      const path = (!p.listing_kind || p.listing_kind === "sale") ? `/property/${p.id}` : `/stays/${p.id}`;
      return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    const roomUrls = (rooms ?? []).map((r: any) => {
      const lastmod = r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString();
      return `  <url>
    <loc>${SITE_URL}/stays/${r.property_id}/rooms/${r.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    const urls = [...propUrls, ...roomUrls].join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`<!-- error: ${(e as Error).message} -->`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  }
});
