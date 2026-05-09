import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Users, Bed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStay } from "@/hooks/useRentals";
import SEO, { breadcrumbLd, SITE_URL } from "@/components/SEO";

const StayDetail = () => {
  const { propertyId } = useParams();
  const id = Number(propertyId);
  const { stay, rooms, loading } = useStay(Number.isFinite(id) ? id : undefined);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!stay) return <Navigate to="/stays" replace />;
  // Sale-only listings should keep using the existing /property page.
  if (stay.listing_kind === "sale") return <Navigate to={`/property/${id}`} replace />;

  const minPrice = rooms.length ? Math.min(...rooms.map((r) => Number(r.nightly_price))) : 0;

  const lodgingLd = {
    "@context": "https://schema.org",
    "@type": stay.listing_kind === "hotel" ? "Hotel" : "LodgingBusiness",
    name: stay.title,
    description: stay.description,
    address: { "@type": "PostalAddress", addressLocality: stay.area || stay.location, addressCountry: "GH" },
    url: `${SITE_URL}/stays/${id}`,
    image: stay.image_url || stay.images?.[0],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${stay.title} — Rooms & Rates`}
        description={(stay.description || `${stay.title} in ${stay.location}. Book rooms by the night with instant availability.`).slice(0, 160)}
        path={`/stays/${id}`}
        image={stay.image_url || undefined}
        jsonLd={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Stays", path: "/stays" },
            { name: stay.title, path: `/stays/${id}` },
          ]),
          lodgingLd,
        ]}
      />

      <section className="relative h-[50vh] min-h-[360px] overflow-hidden">
        <img
          src={stay.image_url || stay.images?.[0] || "/placeholder.svg"}
          alt={stay.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-8 left-0 right-0 px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground drop-shadow">{stay.title}</h1>
            <div className="flex items-center text-muted-foreground mt-2">
              <MapPin className="w-4 h-4 mr-1.5" /> <span>{stay.location}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {stay.description && (
              <div>
                <h2 className="font-serif text-2xl font-semibold mb-3">About this property</h2>
                <p className="text-muted-foreground whitespace-pre-line">{stay.description}</p>
              </div>
            )}
            {stay.amenities && stay.amenities.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Property amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {stay.amenities.map((a) => (
                    <span key={a} className="px-3 py-1 rounded-full bg-muted text-sm text-foreground">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <aside className="rounded-2xl border border-border p-6 h-fit bg-card">
            <p className="text-sm text-muted-foreground">Rooms from</p>
            <p className="font-serif text-3xl font-bold text-foreground">
              {minPrice > 0 ? `$${minPrice.toLocaleString()}` : "—"}
              <span className="text-base font-normal text-muted-foreground"> /night</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">{rooms.length} room{rooms.length === 1 ? "" : "s"} available</p>
          </aside>
        </div>
      </section>

      <section className="py-10 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-6">Available rooms</h2>
          {rooms.length === 0 ? (
            <p className="text-muted-foreground">No rooms have been published for this property yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-2xl overflow-hidden border border-border bg-card flex flex-col"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={r.images?.[0] || stay.image_url || "/placeholder.svg"}
                      alt={r.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg">{r.name}</h3>
                    {r.room_type && <p className="text-sm text-muted-foreground">{r.room_type}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {r.capacity}</span>
                      {r.bed_config && <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> {r.bed_config}</span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="font-serif text-xl font-bold">
                        ${Number(r.nightly_price).toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground"> /night</span>
                      </p>
                      <Link to={`/stays/${id}/rooms/${r.id}`}>
                        <Button size="sm">View & Book</Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default StayDetail;
