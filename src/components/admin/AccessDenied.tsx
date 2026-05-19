import { motion } from "framer-motion";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  message?: string;
  showBackButton?: boolean;
  redirectTo?: string;
}

const AccessDenied = ({
  message = "You don't have permission to access this section. Only Super Admins can view this content.",
  showBackButton = true,
  redirectTo = "/admin",
}: AccessDeniedProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[60vh] flex items-center justify-center px-4"
    >
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>

        <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
          Access Restricted
        </h1>

        <p className="text-muted-foreground mb-2 leading-relaxed">{message}</p>

        <p className="text-sm text-muted-foreground/70 mb-8">
          This section requires <strong className="text-foreground">Super Admin</strong> privileges.
          If you believe this is an error, please contact your system administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBackButton && (
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
          <Button asChild>
            <Link to={redirectTo}>
              <Home className="w-4 h-4 mr-2" />
              Admin Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default AccessDenied;