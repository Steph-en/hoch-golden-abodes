import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { properties as staticProperties, Property as StaticProperty } from "@/data/properties";

export interface DBProperty {
  id: number;
  title: string;
  location: string;
  area: string | null;
  price: string;
  price_value: number;
  beds: number;
  baths: number;
  sqft: string | null;
  type: string;
  featured: boolean;
  description: string | null;
  amenities: string[];
  year_built: number | null;
  parking: number;
  image_url: string | null;
  images: string[];
  status: string;
  units: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Merge DB property with static images (since images are bundled assets)
export const mergeWithStaticImages = (dbProp: DBProperty): StaticProperty & { status: string } => {
  const staticProp = staticProperties.find(p => p.id === dbProp.id);
  return {
    id: dbProp.id,
    title: dbProp.title,
    location: dbProp.location,
    area: dbProp.area || dbProp.location,
    price: dbProp.price,
    priceValue: dbProp.price_value,
    beds: dbProp.beds,
    baths: dbProp.baths,
    sqft: dbProp.sqft || "0",
    type: dbProp.type,
    featured: dbProp.featured,
    description: dbProp.description || "",
    amenities: dbProp.amenities || [],
    yearBuilt: dbProp.year_built || 0,
    parking: dbProp.parking,
    image: dbProp.image_url || staticProp?.image || "/placeholder.svg",
    images: (dbProp.images && dbProp.images.length > 0)
      ? dbProp.images
      : (dbProp.image_url ? [dbProp.image_url] : (staticProp?.images || ["/placeholder.svg"])),
    status: dbProp.status,
    units: dbProp.units ?? 1,
  } as StaticProperty & { status: string; units: number };
};

export const useProperties = () => {
  const [dbProperties, setDbProperties] = useState<DBProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProperties = async () => {
    const { data } = await (supabase as any)
      .from("properties")
      .select("*")
      .is("deleted_at", null)
      .order("id");
    setDbProperties(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const mergedProperties = dbProperties.length > 0
    ? dbProperties.map(mergeWithStaticImages)
    : staticProperties.map(p => ({ ...p, status: "Available" }));

  return { properties: mergedProperties, loading, refetch: fetchProperties };
};

export const getPropertyTitle = (propertyId: number) => {
  const prop = staticProperties.find(p => p.id === propertyId);
  return prop?.title || `Property #${propertyId}`;
};
