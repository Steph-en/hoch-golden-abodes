import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Loader2, Hotel, Building2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStays } from "@/hooks/useRentals";
import SEO, { breadcrumbLd } from "@/components/SEO";

const KIND_TABS = [
  { value: "all", label: "All Stays", icon: Hotel },
  { value: "hotel", label: "Hotels & Short Stay", icon: Hotel },
  { value: "rental_property", label: "Apartments for Rent", icon: Building2 },
  { value: "commercial_rental", label: "Commercial Rentals", icon: Briefcase },
] as const;

const Stays = () => {
  const [kind, setKind] = useState<string>("all");
  const { stays, loading } = useStays(kind);

  const list = useMemo(() => stays, [stays]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Stays, Hotels & Apartments for Rent"
        description="Book hotels, serviced apartments and short-stay accommodations across Ghana. Nightly rates, instant availability check, and secure reservation."
        path="/stays"
        jsonLd={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Stays", path: "/stays" },
        ])}
      />

      <section className="relative py-20 px-4 bg-gradient-to-b from-muted to-background">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Stays & Short-Term Rentals
          </motion.h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Hotels, serviced apartments and apartment complexes — book by the night.
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Tabs value={kind} onValueChange={setKind} className="mb-10">
            <TabsList className="flex flex-wrap h-auto p-1">
              {KIND_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-2">
                  <t.icon className="w-4 h-4" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex flex-col items-center py-24 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading stays…</p>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-foreground mb-2">No stays available yet</h3>
              <p className="text-muted-foreground">Check back soon — new listings are added regularly.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.map((stay, i) => (
                <motion.div
                  key={stay.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  whileHover={{ y: -6 }}
                  className="group bg-background rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-border"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={stay.image_url || stay.images?.[0] || "/placeholder.svg"}
                      alt={stay.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium capitalize">
                        {stay.listing_kind.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-1">{stay.title}</h3>
                    <div className="flex items-center text-muted-foreground text-sm mb-4">
                      <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                      <span className="line-clamp-1">{stay.location}</span>
                    </div>
                    <Link to={`/stays/${stay.id}`}>
                      <Button className="w-full" variant="outline">View rooms</Button>
                    </Link>
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

export default Stays;
