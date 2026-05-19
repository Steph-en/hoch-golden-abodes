import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import AccessDenied from "./AccessDenied";

interface SuperAdminRouteProps {
  children: ReactNode;
  /** Custom message shown when access is denied */
  deniedMessage?: string;
  /** Where to redirect when clicking "Admin Dashboard" on denied screen */
  redirectTo?: string;
}

/**
 * Wraps content that should ONLY be accessible by super_admin users.
 * Shows a loading spinner, access denied screen, or children depending on auth state.
 */
const SuperAdminRoute = ({
  children,
  deniedMessage,
  redirectTo = "/admin",
}: SuperAdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isAdmin, loading: permLoading } = usePermissions();

  const loading = authLoading || permLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in — let the parent page handle redirect
  if (!user || !isAdmin) return null;

  // Logged in but not super_admin — show access denied
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AccessDenied message={deniedMessage} redirectTo={redirectTo} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SuperAdminRoute;