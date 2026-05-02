import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <SEO
        title="Page Not Found (404) | Hoch Online"
        description="The page you are looking for could not be found. Browse our luxury properties or return home."
        path={location.pathname}
        noIndex
      />
      <div className="text-center px-4">
        <h1 className="text-5xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! Page not found</p>
        <Link to="/" className="text-primary hover:underline font-medium">
          Return to Home
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
