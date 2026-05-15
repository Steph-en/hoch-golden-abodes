import { useState, useMemo, useRef, lazy, Suspense, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  MapPin, Bed, Bath, Square, Heart, Search, SlidersHorizontal, X,
  Map, LayoutGrid, Loader2, ArrowUpDown, Hotel, Building2, Briefcase, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useSearchParams } from "react-router-dom";
import { propertyTypes, locations, priceRanges } from "@/data/properties";
import CompareButton from "@/components/CompareButton";
import { useFavorites } from "@/hooks/useFavorites";
import { useProperties } from "@/hooks/useProperties";
import { useStays } from "@/hooks/useRentals";
import type { RentalProperty } from "@/hooks/useRentals";
import SEO, { breadcrumbLd } from "@/components/SEO";

const PropertyMap = lazy(() => import("@/components/PropertyMap"));

const PROPERTY_STATUSES = ["Available", "Reserved", "Sold"] as const;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "beds_desc", label: "Most bedrooms" },
] as const;
type SortKey = typeof SORT_OPTIONS[number]["value"];

type ListingKind = "sale" | "hotel" | "rental_property" | "commercial_rental";

const KIND_TABS: { value: ListingKind; label: string; icon: any }[] = [
  { value: "sale", label: "For Sale", icon: Home },
  { value: "hotel", label: "Hotels & Short Stay", icon: Hotel },
  { value: "rental_property", label: "Apartments for Rent", icon: Building2 },
  { value: "commercial_rental", label: "Commercial Rentals", icon: Briefcase },
];

// ─── Rental property card ──────────────────────────────────────────────────

const RentalCard = ({ stay }: { stay: RentalProperty }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.96 }}
    transition={{ duration: 0.25 }}
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
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-4 left-4">
        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium capitalize">
          {stay.listing_kind === "rental_property"
            ? "Apartment"
            : stay.listing_kind === "hotel"
            ? "Hotel"
            : "Commercial"}
        </span>
      </div>
    </div>
    <div className="p-5">
      <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-1">{stay.title}</h3>
      <div className="flex items-center text-muted-foreground text-sm mb-3">
        <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
        <span className="line-clamp-1">{stay.location}</span>
      </div>
      {stay.nightly_price > 0 && (
        <p className="text-sm font-semibold text-primary mb-4">${stay.nightly_price}/night</p>
      )}
      <Link to={`/stays/${stay.id}`}>
        <Button className="w-full" variant="outline">
          View Rooms
        </Button>
      </Link>
    </div>
  </motion.div>
);

// ─── Rental list pane ─────────────────────────────────────────────────────

const RentalPane = ({ kind }: { kind: ListingKind }) => {
  const [search, setSearch] = useState("");
  const { stays, loading } = useStays(kind);

  const filtered = useMemo(() => {
    if (!search.trim()) return stays;
    const s = search.toLowerCase();
    return stays.filter(
      (st) =>
        st.title.toLowerCase().includes(s) ||
        st.location.toLowerCase().includes(s) ||
        (st.area || "").toLowerCase().includes(s)
    );
  }, [stays, search]);

  return (
    <div>
      {/* Search bar */}
      <div className="relative max-w-md mx-auto mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${kind === "hotel" ? "hotels" : kind === "rental_property" ? "apartments" : "commercial listings"}…`}
          className="pl-12 py-5 rounded-full border-2 border-border focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Loading listings…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Hotel className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {stays.length === 0 ? "No listings yet" : "No results found"}
          </h3>
          <p className="text-muted-foreground">
            {stays.length === 0
              ? "Check back soon — new listings are added regularly."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((stay) => (
              <RentalCard key={stay.id} stay={stay} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

// ─── Main Explore page ────────────────────────────────────────────────────

const Explore = () => {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });
  const { properties, loading } = useProperties();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active listing kind tab — defaults to "sale"
  const kindParam = searchParams.get("kind") as ListingKind | null;
  const [activeKind, setActiveKind] = useState<ListingKind>(
    KIND_TABS.some((t) => t.value === kindParam) ? (kindParam as ListingKind) : "sale"
  );

  // Sales-specific filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedType, setSelectedType] = useState<string | null>(searchParams.get("type"));
  const [selectedLocation, setSelectedLocation] = useState<string | null>(searchParams.get("location"));
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(searchParams.get("price"));
  const [selectedStatus, setSelectedStatus] = useState<string | null>(searchParams.get("status"));
  const [sortBy, setSortBy] = useState<SortKey>((searchParams.get("sort") as SortKey) || "newest");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const { toggleFavorite, isFavorite } = useFavorites();

  // Sync state → URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (activeKind !== "sale") params.kind = activeKind;
    if (activeKind === "sale") {
      if (searchQuery) params.q = searchQuery;
      if (selectedType) params.type = selectedType;
      if (selectedLocation) params.location = selectedLocation;
      if (selectedPriceRange) params.price = selectedPriceRange;
      if (selectedStatus) params.status = selectedStatus;
      if (sortBy && sortBy !== "newest") params.sort = sortBy;
    }
    setSearchParams(params, { replace: true });
  }, [activeKind, searchQuery, selectedType, selectedLocation, selectedPriceRange, selectedStatus, sortBy]);

  const filteredSaleProperties = useMemo(() => {
    const filtered = properties.filter((property: any) => {
      const isSale = !property.listing_kind || property.listing_kind === "sale";
      if (!isSale) return false;
      const matchesSearch =
        property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !selectedType || property.type === selectedType;
      const matchesLocation = !selectedLocation || property.location.includes(selectedLocation);
      const matchesStatus = !selectedStatus || property.status === selectedStatus;
      let matchesPrice = true;
      if (selectedPriceRange) {
        const range = priceRanges.find((r) => r.label === selectedPriceRange);
        if (range) matchesPrice = property.priceValue >= range.min && property.priceValue <= range.max;
      }
      return matchesSearch && matchesType && matchesLocation && matchesPrice && matchesStatus;
    });
    const sorted = [...filtered];
    switch (sortBy) {
      case "price_asc": sorted.sort((a, b) => a.priceValue - b.priceValue); break;
      case "price_desc": sorted.sort((a, b) => b.priceValue - a.priceValue); break;
      case "beds_desc": sorted.sort((a, b) => b.beds - a.beds); break;
      default: sorted.sort((a, b) => b.id - a.id);
    }
    return sorted;
  }, [properties, searchQuery, selectedType, selectedLocation, selectedPriceRange, selectedStatus, sortBy]);

  const clearFilters = () => {
    setSelectedType(null);
    setSelectedLocation(null);
    setSelectedPriceRange(null);
    setSelectedStatus(null);
    setSearchQuery("");
    setSortBy("newest");
  };

  const hasActiveFilters = selectedType || selectedLocation || selectedPriceRange || selectedStatus || searchQuery;

  const activeTab = KIND_TABS.find((t) => t.value === activeKind)!;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Explore Properties | For Sale, Hotels & Rentals in Accra"
        description="Browse luxury villas for sale, hotels, serviced apartments and commercial rentals across East Legon and Accra, Ghana."
        path="/explore"
        jsonLd={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: activeKind === "sale" ? "Properties" : "Stays", path: "/explore" },
        ])}
      />

      {/* ── Page header ── */}
      <section ref={headerRef} className="relative py-20 px-4 bg-gradient-to-b from-muted to-background">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
              Explore Properties
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Discover exceptional properties, hotels, and rentals across Ghana's finest locations
            </p>
          </motion.div>

          {/* ── Kind tabs ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            {KIND_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeKind === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveKind(tab.value);
                    setShowFilters(false);
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-gold"
                      : "bg-background border border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </motion.div>

          {/* ── Search bar (sales only) ── */}
          {activeKind === "sale" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={headerInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="max-w-2xl mx-auto"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or location…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg rounded-full border-2 border-border focus:border-primary"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Sales filters ── */}
      {activeKind === "sale" && (
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="flex flex-wrap gap-2">
                      {propertyTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedType(selectedType === type ? null : type)}
                          className={`px-4 py-2 rounded-full text-sm transition-all ${
                            selectedType === type
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <div className="flex flex-wrap gap-2">
                      {locations.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => setSelectedLocation(selectedLocation === loc ? null : loc)}
                          className={`px-4 py-2 rounded-full text-sm transition-all ${
                            selectedLocation === loc
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Price</label>
                    <div className="flex flex-wrap gap-2">
                      {priceRanges.map((range) => (
                        <button
                          key={range.label}
                          onClick={() => setSelectedPriceRange(selectedPriceRange === range.label ? null : range.label)}
                          className={`px-4 py-2 rounded-full text-sm transition-all ${
                            selectedPriceRange === range.label
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {PROPERTY_STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                          className={`px-4 py-2 rounded-full text-sm transition-all ${
                            selectedStatus === status
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Main content ── */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">

          {/* ── Non-sale kinds: delegate to RentalPane ── */}
          {activeKind !== "sale" && <RentalPane kind={activeKind} />}

          {/* ── Sales kind ── */}
          {activeKind === "sale" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredSaleProperties.length}</span>{" "}
                  {filteredSaleProperties.length === 1 ? "property" : "properties"} found
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
                    <LayoutGrid className="w-4 h-4 mr-1" /> Grid
                  </Button>
                  <Button variant={viewMode === "map" ? "default" : "outline"} size="sm" onClick={() => setViewMode("map")}>
                    <Map className="w-4 h-4 mr-1" /> Map
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                  <p>Loading properties…</p>
                </div>
              ) : viewMode === "map" ? (
                <Suspense fallback={<div className="h-[500px] bg-muted rounded-2xl animate-pulse" />}>
                  <PropertyMap />
                </Suspense>
              ) : (
                <>
                  <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {filteredSaleProperties.map((property, index) => (
                        <motion.div
                          key={property.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3, delay: index * 0.04 }}
                          whileHover={{ y: -8 }}
                          className="group bg-background rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-border"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden">
                            <img
                              src={property.image}
                              alt={property.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-4 right-4 flex gap-2">
                              <CompareButton property={property} />
                              <button
                                onClick={() => toggleFavorite(property.id)}
                                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                              >
                                <Heart
                                  className={`w-5 h-5 transition-colors ${
                                    isFavorite(property.id) ? "text-red-500 fill-red-500" : "text-foreground"
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="absolute bottom-4 left-4">
                              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full">
                                <span className="font-bold text-foreground">{property.price}</span>
                              </div>
                            </div>
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                                {property.type}
                              </span>
                              {(property as any).status && (property as any).status !== "Available" && (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    (property as any).status === "Sold"
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-secondary text-secondary-foreground"
                                  }`}
                                >
                                  {(property as any).status}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-5">
                            <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-1">
                              {property.title}
                            </h3>
                            <div className="flex items-center text-muted-foreground text-sm mb-4">
                              <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                              <span className="line-clamp-1">{property.location}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5 border-t border-border pt-4">
                              <div className="flex items-center gap-1.5"><Bed className="w-4 h-4" /><span>{property.beds}</span></div>
                              <div className="flex items-center gap-1.5"><Bath className="w-4 h-4" /><span>{property.baths}</span></div>
                              <div className="flex items-center gap-1.5"><Square className="w-4 h-4" /><span>{property.sqft} sqft</span></div>
                            </div>
                            <Link to={`/property/${property.id}`}>
                              <Button className="w-full" variant="outline">View Details</Button>
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {filteredSaleProperties.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No properties found</h3>
                      <p className="text-muted-foreground mb-6">Try adjusting your filters or search query</p>
                      <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
                    </motion.div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Explore;