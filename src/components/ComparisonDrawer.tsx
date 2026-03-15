import { motion, AnimatePresence } from "framer-motion";
import { X, Bed, Bath, Square, Car, Calendar, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComparison } from "@/contexts/ComparisonContext";
import { Link } from "react-router-dom";

const ComparisonDrawer = () => {
  const { compareList, removeFromCompare, clearCompare, isDrawerOpen, setIsDrawerOpen } = useComparison();

  if (compareList.length === 0) return null;

  return (
    <>
      {/* Floating Compare Bar */}
      <AnimatePresence>
        {!isDrawerOpen && compareList.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4"
          >
            <div className="flex -space-x-3">
              {compareList.map((p) => (
                <div key={p.id} className="w-10 h-10 rounded-full border-2 border-foreground overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <span className="text-sm font-medium">
              {compareList.length}/3 properties
            </span>
            <Button
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="btn-primary"
            >
              Compare Now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <button onClick={clearCompare} className="text-background/60 hover:text-background ml-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-background z-50 overflow-y-auto shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    Compare Properties
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {compareList.length} of 3 properties selected
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={clearCompare}>
                    Clear All
                  </Button>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="p-6">
                {/* Property Images & Names */}
                <div className={`grid gap-4 mb-8`} style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                  {compareList.map((property) => (
                    <div key={property.id} className="relative">
                      <button
                        onClick={() => removeFromCompare(property.id)}
                        className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3">
                        <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm line-clamp-1">{property.title}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                        <MapPin className="w-3 h-3" />
                        {property.location}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comparison Rows */}
                <div className="space-y-1">
                  <CompareRow label="Price" values={compareList.map((p) => p.price)} highlight />
                  <CompareRow label="Type" values={compareList.map((p) => p.type)} />
                  <CompareRow
                    label="Bedrooms"
                    values={compareList.map((p) => (p.beds > 0 ? `${p.beds}` : "N/A"))}
                    icon={<Bed className="w-4 h-4" />}
                  />
                  <CompareRow
                    label="Bathrooms"
                    values={compareList.map((p) => (p.baths > 0 ? `${p.baths}` : "N/A"))}
                    icon={<Bath className="w-4 h-4" />}
                  />
                  <CompareRow
                    label="Size"
                    values={compareList.map((p) => `${p.sqft} sqft`)}
                    icon={<Square className="w-4 h-4" />}
                  />
                  <CompareRow
                    label="Parking"
                    values={compareList.map((p) => `${p.parking} spaces`)}
                    icon={<Car className="w-4 h-4" />}
                  />
                  <CompareRow
                    label="Year Built"
                    values={compareList.map((p) => `${p.yearBuilt}`)}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                </div>

                {/* Amenities Comparison */}
                <div className="mt-8">
                  <h3 className="font-semibold text-foreground mb-4">Amenities</h3>
                  {(() => {
                    const allAmenities = Array.from(
                      new Set(compareList.flatMap((p) => p.amenities))
                    );
                    return (
                      <div className="space-y-1">
                        {allAmenities.map((amenity) => (
                          <div
                            key={amenity}
                            className={`grid gap-4 p-3 rounded-lg`}
                            style={{ gridTemplateColumns: `140px repeat(${compareList.length}, 1fr)` }}
                          >
                            <span className="text-sm text-muted-foreground">{amenity}</span>
                            {compareList.map((p) => (
                              <span key={p.id} className="text-center">
                                {p.amenities.includes(amenity) ? (
                                  <span className="text-primary font-bold">✓</span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* View Details Buttons */}
                <div className={`grid gap-4 mt-8`} style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
                  {compareList.map((property) => (
                    <Button key={property.id} asChild variant="outline" className="w-full">
                      <Link to={`/property/${property.id}`} onClick={() => setIsDrawerOpen(false)}>
                        View Details
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const CompareRow = ({
  label,
  values,
  icon,
  highlight,
}: {
  label: string;
  values: string[];
  icon?: React.ReactNode;
  highlight?: boolean;
}) => (
  <div
    className={`grid gap-4 p-3 rounded-lg ${highlight ? "bg-primary/5" : "even:bg-muted/30"}`}
    style={{ gridTemplateColumns: `140px repeat(${values.length}, 1fr)` }}
  >
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {icon}
      {label}
    </div>
    {values.map((value, i) => (
      <span
        key={i}
        className={`text-center text-sm ${highlight ? "font-bold text-primary" : "text-foreground font-medium"}`}
      >
        {value}
      </span>
    ))}
  </div>
);

export default ComparisonDrawer;
