export interface Property {
  id: number;
  image: string;
  images: string[];
  title: string;
  location: string;
  area: string;
  price: string;
  priceValue: number;
  beds: number;
  baths: number;
  sqft: string;
  type: string;
  featured: boolean;
  description: string;
  amenities: string[];
  yearBuilt: number;
  parking: number;
  floorPlan?: string;
}

export const properties: Property[] = [];

export const propertyTypes = ["All", "Villa", "Apartment", "Townhouse", "Penthouse", "Commercial"];

export const locations = ["All Areas", "East Legon", "Airport Residential", "Cantonments", "Cape Coast", "Osu", "Ridge"];

export const priceRanges = [
  { label: "Any Price", min: 0, max: Infinity },
  { label: "Under $500K", min: 0, max: 500000 },
  { label: "$500K - $1M", min: 500000, max: 1000000 },
  { label: "$1M - $2M", min: 1000000, max: 2000000 },
  { label: "Over $2M", min: 2000000, max: Infinity },
];

export const getPropertyById = (id: number): Property | undefined => {
  return properties.find(p => p.id === id);
};
