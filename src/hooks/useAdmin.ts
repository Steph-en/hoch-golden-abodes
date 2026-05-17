import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AdminState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

export const useAdmin = (): AdminState => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }: any) => {
        const roles: string[] = (data || []).map((r: any) => r.role);
        const superAdmin = roles.includes("super_admin");
        const admin = roles.includes("admin") || superAdmin;
        setIsSuperAdmin(superAdmin);
        setIsAdmin(admin);
        setLoading(false);
      });
  }, [user]);

  return { isAdmin, isSuperAdmin, loading };
};