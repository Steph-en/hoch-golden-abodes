import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Bed, Bath, Square, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { properties, propertyTypes } from "@/data/properties";

const FeaturedProperties = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [likedProperties, setLikedProperties] = useState<number[]>([]);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const filteredProperties = properties.filter(
    (property) => activeFilter === "All" || property.type === activeFilter
  );

  const toggleLike = (id: number) => {
    setLikedProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-primary/5 to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-radial from-primary/5 to-transparent opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Featured Properties
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
            Exceptional Properties for
            <br />
            <span className="text-gradient">Exceptional Living</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover our handpicked selection of luxury properties across Ghana's most 
            prestigious locations
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {propertyTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeFilter === type
                  ? "bg-primary text-primary-foreground shadow-gold"
                  : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {type}
            </button>
          ))}
        </motion.div>

        {/* Properties Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {filteredProperties.map((property) => (
            <motion.div
              key={property.id}
              variants={itemVariants}
              onMouseEnter={() => setHoveredId(property.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative bg-card rounded-2xl overflow-hidden shadow-md-custom transition-all duration-500 hover:shadow-xl-custom hover:-translate-y-2"
            >
              {/* Image Container */}
              <div className="relative h-72 overflow-hidden">
                <motion.img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  animate={{
                    scale: hoveredId === property.id ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />

                {/* Featured Badge */}
                {property.featured && (
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    Featured
                  </div>
                )}

                {/* Like Button */}
                <button
                  onClick={() => toggleLike(property.id)}
                  className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
                    likedProperties.includes(property.id)
                      ? "bg-red-500 text-white"
                      : "bg-white/20 text-white hover:bg-white/40"
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      likedProperties.includes(property.id) ? "fill-current" : ""
                    }`}
                  />
                </button>

                {/* Price Tag */}
                <div className="absolute bottom-4 left-4">
                  <p className="text-2xl font-display font-semibold text-white">
                    {property.price}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {property.location}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {property.title}
                </h3>

                {/* Property Details */}
                {property.beds > 0 && (
                  <div className="flex items-center gap-6 pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Bed className="w-4 h-4" />
                      <span className="text-sm">{property.beds} Beds</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Bath className="w-4 h-4" />
                      <span className="text-sm">{property.baths} Baths</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Square className="w-4 h-4" />
                      <span className="text-sm">{property.sqft} sqft</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Hover Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredId === property.id ? 1 : 0 }}
                className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-foreground via-foreground/90 to-transparent pt-20"
              >
                <Button asChild className="w-full btn-primary group/btn">
                  <Link to={`/property/${property.id}`}>
                    View Property
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16"
        >
          <Button asChild size="lg" variant="outline" className="btn-outline group">
            <Link to="/explore">
              View All Properties
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
