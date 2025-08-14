import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Bed, Bath, Square, Eye, Heart, Filter } from "lucide-react";

const Explore = () => {
  const [filters, setFilters] = useState({
    location: "",
    priceRange: "",
    propertyType: "",
    bedrooms: ""
  });

  const properties = [
    {
      id: 1,
      title: "Luxury Villa in East Legon",
      price: "$850,000",
      location: "East Legon, Accra",
      bedrooms: 5,
      bathrooms: 4,
      size: "4,200 sq ft",
      type: "Villa",
      image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop",
      featured: true,
      virtualTour: true
    },
    {
      id: 2,
      title: "Modern Penthouse Apartment",
      price: "$650,000",
      location: "Airport Residential, Accra",
      bedrooms: 3,
      bathrooms: 3,
      size: "2,800 sq ft",
      type: "Penthouse",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop",
      featured: true,
      virtualTour: true
    },
    {
      id: 3,
      title: "Contemporary Townhouse",
      price: "$420,000",
      location: "Cantonments, Accra",
      bedrooms: 4,
      bathrooms: 3,
      size: "3,100 sq ft",
      type: "Townhouse",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop",
      featured: false,
      virtualTour: false
    },
    {
      id: 4,
      title: "Executive Apartment",
      price: "$380,000",
      location: "Labone, Accra",
      bedrooms: 3,
      bathrooms: 2,
      size: "2,200 sq ft",
      type: "Apartment",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop",
      featured: false,
      virtualTour: true
    },
    {
      id: 5,
      title: "Waterfront Mansion",
      price: "$1,200,000",
      location: "Tema, Greater Accra",
      bedrooms: 6,
      bathrooms: 5,
      size: "6,500 sq ft",
      type: "Mansion",
      image: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=600&h=400&fit=crop",
      featured: true,
      virtualTour: true
    },
    {
      id: 6,
      title: "Garden City Duplex",
      price: "$320,000",
      location: "Kasoa, Central Region",
      bedrooms: 4,
      bathrooms: 3,
      size: "2,900 sq ft",
      type: "Duplex",
      image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&h=400&fit=crop",
      featured: false,
      virtualTour: false
    }
  ];

  const [filteredProperties, setFilteredProperties] = useState(properties);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Simple filtering logic
    const filtered = properties.filter(property => {
      return (
        (!newFilters.location || property.location.toLowerCase().includes(newFilters.location.toLowerCase())) &&
        (!newFilters.propertyType || property.type === newFilters.propertyType) &&
        (!newFilters.bedrooms || property.bedrooms.toString() === newFilters.bedrooms)
      );
    });
    setFilteredProperties(filtered);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif-luxury text-4xl md:text-5xl font-bold text-foreground mb-4">
            Explore <span className="text-primary">Premium Properties</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover luxury homes in the most prestigious locations across Greater Accra
          </p>
        </div>

        {/* Filters */}
        <div className="bg-secondary rounded-2xl p-6 mb-12">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-primary mr-2" />
            <h3 className="font-semibold text-foreground">Filter Properties</h3>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Location (e.g., East Legon)"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                value={filters.priceRange}
                onChange={(e) => handleFilterChange("priceRange", e.target.value)}
              >
                <option value="">Price Range</option>
                <option value="under-400k">Under $400k</option>
                <option value="400k-600k">$400k - $600k</option>
                <option value="600k-1m">$600k - $1M</option>
                <option value="above-1m">Above $1M</option>
              </select>
            </div>
            <div>
              <select
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                value={filters.propertyType}
                onChange={(e) => handleFilterChange("propertyType", e.target.value)}
              >
                <option value="">Property Type</option>
                <option value="Villa">Villa</option>
                <option value="Apartment">Apartment</option>
                <option value="Penthouse">Penthouse</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Mansion">Mansion</option>
                <option value="Duplex">Duplex</option>
              </select>
            </div>
            <div>
              <select
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
                value={filters.bedrooms}
                onChange={(e) => handleFilterChange("bedrooms", e.target.value)}
              >
                <option value="">Bedrooms</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4">4 Bedrooms</option>
                <option value="5">5+ Bedrooms</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-8">
          <p className="text-muted-foreground">
            Showing {filteredProperties.length} properties
          </p>
        </div>

        {/* Property Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="property-card overflow-hidden">
              <div className="relative">
                <img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 left-4">
                  {property.featured && (
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                      Featured
                    </span>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex space-x-2">
                  {property.virtualTour && (
                    <button className="bg-background/90 p-2 rounded-full hover:bg-background transition-colors">
                      <Eye className="w-4 h-4 text-foreground" />
                    </button>
                  )}
                  <button className="bg-background/90 p-2 rounded-full hover:bg-background transition-colors">
                    <Heart className="w-4 h-4 text-foreground" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-background/90 text-foreground px-3 py-1 rounded-full text-sm font-semibold">
                    {property.price}
                  </span>
                </div>
              </div>
              
              <CardContent className="p-6">
                <h3 className="font-serif-luxury text-xl font-semibold text-foreground mb-2">
                  {property.title}
                </h3>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{property.location}</span>
                </div>
                
                <div className="flex justify-between text-sm text-muted-foreground mb-6">
                  <div className="flex items-center">
                    <Bed className="w-4 h-4 mr-1" />
                    <span>{property.bedrooms} beds</span>
                  </div>
                  <div className="flex items-center">
                    <Bath className="w-4 h-4 mr-1" />
                    <span>{property.bathrooms} baths</span>
                  </div>
                  <div className="flex items-center">
                    <Square className="w-4 h-4 mr-1" />
                    <span>{property.size}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button className="flex-1 btn-gold">
                    See Details
                  </Button>
                  {property.virtualTour && (
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="px-8">
            Load More Properties
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Explore;