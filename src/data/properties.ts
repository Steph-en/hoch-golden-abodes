import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import property4 from "@/assets/property-4.jpg";
import property5 from "@/assets/property-5.jpg";
import property6 from "@/assets/property-6.jpg";

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

export const properties: Property[] = [
  {
    id: 1,
    image: property1,
    images: [property1, property2, property3],
    title: "Tropical Villa Retreat",
    location: "East Legon, Accra",
    area: "East Legon",
    price: "$850,000",
    priceValue: 850000,
    beds: 5,
    baths: 4,
    sqft: "4,200",
    type: "Villa",
    featured: true,
    description: "Experience luxury living in this magnificent tropical villa nestled in the heart of East Legon. This stunning property features expansive living spaces, a private pool, and lush gardens. The modern architecture seamlessly blends with traditional Ghanaian elements, creating a unique and sophisticated atmosphere.",
    amenities: ["Swimming Pool", "Garden", "Smart Home", "Security System", "Generator", "Staff Quarters"],
    yearBuilt: 2022,
    parking: 4,
  },
  {
    id: 2,
    image: property2,
    images: [property2, property1, property4],
    title: "Modern City Apartment",
    location: "Airport Residential, Accra",
    area: "Airport Residential",
    price: "$320,000",
    priceValue: 320000,
    beds: 3,
    baths: 2,
    sqft: "1,800",
    type: "Apartment",
    featured: false,
    description: "Sleek contemporary apartment in the prestigious Airport Residential area. Enjoy panoramic city views, premium finishes, and access to world-class amenities. Perfect for professionals seeking modern urban living with convenience at their doorstep.",
    amenities: ["Gym", "Concierge", "Rooftop Terrace", "Underground Parking", "24/7 Security"],
    yearBuilt: 2023,
    parking: 2,
  },
  {
    id: 3,
    image: property3,
    images: [property3, property5, property6],
    title: "Executive Townhouse",
    location: "Cantonments, Accra",
    area: "Cantonments",
    price: "$520,000",
    priceValue: 520000,
    beds: 4,
    baths: 3,
    sqft: "2,600",
    type: "Townhouse",
    featured: true,
    description: "Elegant townhouse in the diplomatic enclave of Cantonments. This property offers sophisticated living with spacious interiors, a private courtyard, and proximity to embassies and international schools. Ideal for discerning families seeking privacy and prestige.",
    amenities: ["Private Courtyard", "Home Office", "Backup Power", "Fiber Internet", "Air Conditioning"],
    yearBuilt: 2021,
    parking: 2,
  },
  {
    id: 4,
    image: property4,
    images: [property4, property1, property2],
    title: "Beachfront Paradise",
    location: "Cape Coast",
    area: "Cape Coast",
    price: "$1,200,000",
    priceValue: 1200000,
    beds: 6,
    baths: 5,
    sqft: "5,500",
    type: "Villa",
    featured: true,
    description: "Wake up to breathtaking ocean views in this luxurious beachfront villa. Featuring direct beach access, infinity pool, and expansive outdoor entertaining areas. A rare opportunity to own a piece of Ghana's stunning coastline.",
    amenities: ["Beach Access", "Infinity Pool", "Outdoor Kitchen", "Wine Cellar", "Guest House", "Boat Dock"],
    yearBuilt: 2020,
    parking: 6,
  },
  {
    id: 5,
    image: property5,
    images: [property5, property3, property6],
    title: "Commercial Complex",
    location: "Osu, Accra",
    area: "Osu",
    price: "$2,500,000",
    priceValue: 2500000,
    beds: 0,
    baths: 0,
    sqft: "12,000",
    type: "Commercial",
    featured: false,
    description: "Prime commercial property in the bustling heart of Osu. Multi-story complex with retail spaces, office suites, and ample parking. Excellent investment opportunity in one of Accra's most vibrant commercial districts.",
    amenities: ["Elevator", "Loading Dock", "Central Air", "CCTV", "Backup Generator", "Conference Rooms"],
    yearBuilt: 2019,
    parking: 20,
  },
  {
    id: 6,
    image: property6,
    images: [property6, property4, property2],
    title: "Skyline Penthouse",
    location: "Ridge, Accra",
    area: "Ridge",
    price: "$780,000",
    priceValue: 780000,
    beds: 4,
    baths: 3,
    sqft: "3,200",
    type: "Penthouse",
    featured: true,
    description: "Exclusive penthouse offering 360-degree views of Accra's skyline. This architectural masterpiece features floor-to-ceiling windows, designer finishes, and a private rooftop terrace. The epitome of luxury high-rise living.",
    amenities: ["Private Elevator", "Rooftop Terrace", "Smart Home", "Wine Room", "Home Theater", "Sauna"],
    yearBuilt: 2024,
    parking: 3,
  },
];

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
