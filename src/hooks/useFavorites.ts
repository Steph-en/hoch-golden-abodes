import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("favorite_properties")
      .select("property_id")
      .eq("user_id", user.id);
    setFavorites(data?.map((f: any) => f.property_id) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const toggleFavorite = async (propertyId: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorite properties.",
        variant: "destructive",
      });
      return;
    }

    if (favorites.includes(propertyId)) {
      await (supabase as any)
        .from("favorite_properties")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", propertyId);
      setFavorites((prev) => prev.filter((id) => id !== propertyId));
      toast({ title: "Removed from favorites" });
    } else {
      await (supabase as any)
        .from("favorite_properties")
        .insert({ user_id: user.id, property_id: propertyId });
      setFavorites((prev) => [...prev, propertyId]);
      toast({ title: "Added to favorites" });
    }
  };

  const isFavorite = (propertyId: number) => favorites.includes(propertyId);

  return { favorites, toggleFavorite, isFavorite, loading };
};
