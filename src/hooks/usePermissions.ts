import { useMemo } from "react";
import { useAdmin } from "@/hooks/useAdmin";

export type AdminTabId =
  | "overview"
  | "users"
  | "enquiries"
  | "properties"
  | "agreements"
  | "payments"
  | "activity"
  | "rooms"
  | "stays_bookings";

// Tabs only super_admin can access
const SUPER_ADMIN_ONLY_TABS: AdminTabId[] = [
  "overview",
  "users",
  "enquiries",
  "agreements",
  "payments",
  "activity",
];

// Tabs both admin and super_admin can access
const ADMIN_TABS: AdminTabId[] = [
  "properties",
  "rooms",
  "stays_bookings",
];

// Super admin only pages (separate routes)
export const SUPER_ADMIN_ONLY_ROUTES = [
  "/admin/roles",
  "/admin/audit",
  "/admin/diagnostics",
  "/admin/admins",
];

export interface Permission {
  canAccess: (tab: AdminTabId) => boolean;
  canAccessRoute: (route: string) => boolean;
  allowedTabs: AdminTabId[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export const usePermissions = (): Permission => {
  const { isAdmin, isSuperAdmin, loading } = useAdmin();

  const allowedTabs = useMemo<AdminTabId[]>(() => {
    if (isSuperAdmin) {
      return [...SUPER_ADMIN_ONLY_TABS, ...ADMIN_TABS];
    }
    if (isAdmin) {
      return ADMIN_TABS;
    }
    return [];
  }, [isAdmin, isSuperAdmin]);

  const canAccess = (tab: AdminTabId): boolean => {
    if (SUPER_ADMIN_ONLY_TABS.includes(tab)) return isSuperAdmin;
    if (ADMIN_TABS.includes(tab)) return isAdmin;
    return false;
  };

  const canAccessRoute = (route: string): boolean => {
    if (SUPER_ADMIN_ONLY_ROUTES.some(r => route.startsWith(r))) {
      return isSuperAdmin;
    }
    return isAdmin;
  };

  return {
    canAccess,
    canAccessRoute,
    allowedTabs,
    isSuperAdmin,
    isAdmin,
    loading,
  };
};