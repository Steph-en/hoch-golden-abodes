import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Home, DollarSign, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { locations, propertyTypes, priceRanges } from "@/data/properties";

const PropertySearch = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("All Areas");
  const [propertyType, setPropertyType] = useState("All");
  const [priceRange, setPriceRange] = useState("Any Price");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location !== "All Areas") params.set("location", location);
    if (propertyType !== "All") params.set("type", propertyType);
    if (priceRange !== "Any Price") params.set("price", priceRange);
    navigate(`/explore?${params.toString()}`);
  };

  const closeAllDropdowns = () => {
    setShowLocationDropdown(false);
    setShowTypeDropdown(false);
    setShowPriceDropdown(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="mt-8"
    >
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-2">
          {/* Location Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => {
                closeAllDropdowns();
                setShowLocationDropdown(!showLocationDropdown);
              }}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left"
            >
              <MapPin className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-white/60 uppercase tracking-wider">Location</p>
                <p className="text-white font-medium">{location}</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-white/60 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showLocationDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl-custom z-50 overflow-hidden"
              >
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      setLocation(loc);
                      setShowLocationDropdown(false);
                    }}
                    className={`w-full px-5 py-3 text-left hover:bg-secondary transition-colors ${
                      location === loc ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Property Type Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => {
                closeAllDropdowns();
                setShowTypeDropdown(!showTypeDropdown);
              }}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left"
            >
              <Home className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-white/60 uppercase tracking-wider">Property Type</p>
                <p className="text-white font-medium">{propertyType}</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-white/60 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showTypeDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl-custom z-50 overflow-hidden"
              >
                {propertyTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setPropertyType(type);
                      setShowTypeDropdown(false);
                    }}
                    className={`w-full px-5 py-3 text-left hover:bg-secondary transition-colors ${
                      propertyType === type ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Price Range Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => {
                closeAllDropdowns();
                setShowPriceDropdown(!showPriceDropdown);
              }}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left"
            >
              <DollarSign className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-white/60 uppercase tracking-wider">Price Range</p>
                <p className="text-white font-medium">{priceRange}</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-white/60 transition-transform ${showPriceDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showPriceDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl-custom z-50 overflow-hidden"
              >
                {priceRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => {
                      setPriceRange(range.label);
                      setShowPriceDropdown(false);
                    }}
                    className={`w-full px-5 py-3 text-left hover:bg-secondary transition-colors ${
                      priceRange === range.label ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            size="lg"
            className="btn-primary px-8 py-7 rounded-xl flex items-center gap-2 group"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertySearch;
