import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Bed, Bath, Square, Heart, ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { properties, propertyTypes } from "@/data/properties";
import CompareButton from "./CompareButton";
import { useFavorites } from "@/hooks/useFavorites";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FeaturedProperties = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { toggleFavorite, isFavorite } = useFavorites();

  const filteredProperties = properties.filter(
    (property) => activeFilter === "All" || property.type === activeFilter
  );

  // GSAP scroll-triggered animations
  useEffect(() => {
    if (!gridRef.current) return;

    const cards = gridRef.current.querySelectorAll(".property-card-gsap");

    const anims = gsap.fromTo(
      cards,
      { y: 100, opacity: 0, scale: 0.92 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.9,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );

    return () => {
      anims.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [activeFilter]);

  // Section header reveal
  useEffect(() => {
    if (!headerRef.current) return;

    gsap.fromTo(
      headerRef.current.querySelectorAll(".reveal-line"),
      { y: 80, opacity: 0, clipPath: "inset(100% 0% 0% 0%)" },
      {
        y: 0,
        opacity: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1,
        stagger: 0.15,
        ease: "power4.out",
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );
  }, []);

  return (
    <section ref={sectionRef} className="py-28 lg:py-36 bg-background relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-primary/3 to-transparent opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-20">
          <div className="overflow-hidden">
            <span className="reveal-line inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 uppercase tracking-widest">
              Featured Collection
            </span>
          </div>
          <div className="overflow-hidden">
            <h2 className="reveal-line font-display text-4xl md:text-5xl lg:text-7xl font-semibold text-foreground mb-6 leading-tight">
              Exceptional Properties
            </h2>
          </div>
          <div className="overflow-hidden">
            <h2 className="reveal-line font-display text-4xl md:text-5xl lg:text-7xl font-semibold mb-6">
              <span className="text-gradient">Exceptional Living</span>
            </h2>
          </div>
          <div className="overflow-hidden">
            <p className="reveal-line text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover our handpicked selection of luxury properties across Ghana's most
              prestigious locations
            </p>
          </div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-14"
        >
          {propertyTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-500 ${
                activeFilter === type
                  ? "bg-primary text-primary-foreground shadow-gold"
                  : "bg-transparent text-muted-foreground border border-border hover:border-primary hover:text-primary"
              }`}
            >
              {type}
            </button>
          ))}
        </motion.div>

        {/* Properties Grid */}
        <div ref={gridRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              onMouseEnter={() => setHoveredId(property.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="property-card-gsap group relative bg-card rounded-2xl overflow-hidden border border-border/50 transition-all duration-700 hover:shadow-xl-custom hover:-translate-y-3"
            >
              {/* Image Container with zoom effect */}
              <div className="relative h-72 overflow-hidden">
                <motion.img
                  src={property.image}
                  alt={property.title}
duration-1200
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                {property.featured && (
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium tracking-wider uppercase">
                    Featured
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <CompareButton property={property} />
                  <button
                    onClick={() => toggleFavorite(property.id)}
                    className={`p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
                      isFavorite(property.id)
                        ? "bg-red-500 text-white"
                        : "bg-white/10 text-white hover:bg-white/30"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite(property.id) ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Price - slides up on hover */}
                <motion.div
                  initial={false}
                  animate={{
                    y: hoveredId === property.id ? 0 : 10,
                    opacity: hoveredId === property.id ? 1 : 0.8,
                  }}
                  className="absolute bottom-4 left-4"
                >
                  <p className="text-2xl font-display font-bold text-white">{property.price}</p>
                </motion.div>

                {/* View button slides up on hover */}
                <motion.div
                  initial={false}
                  animate={{
                    y: hoveredId === property.id ? 0 : 20,
                    opacity: hoveredId === property.id ? 1 : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute bottom-4 right-4"
                >
                  <Link
                    to={`/property/${property.id}`}
                    className="p-3 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs uppercase tracking-wider">{property.location}</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-4 group-hover:text-primary transition-colors duration-500">
                  {property.title}
                </h3>

                {property.beds > 0 && (
                  <div className="flex items-center gap-6 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Bed className="w-4 h-4" />
                      <span className="text-sm">{property.beds}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Bath className="w-4 h-4" />
                      <span className="text-sm">{property.baths}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Square className="w-4 h-4" />
                      <span className="text-sm">{property.sqft} sqft</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View All */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-20"
        >
          <Button asChild size="lg" variant="outline" className="group border-primary/30 hover:border-primary hover:bg-primary/5 px-10">
            <Link to="/explore">
              <span className="mr-2">View All Properties</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
