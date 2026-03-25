import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, ArrowRight, User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import logo from "@/assets/logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const location = useLocation();

  const navigation = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Properties", href: "/explore" },
    { name: "Services", href: "/services" },
    { name: "Contact", href: "/contact" },
    ...(isAdmin ? [{ name: "Admin", href: "/admin" }] : []),
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? "py-3 bg-white/80 backdrop-blur-xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.1)] border-b border-white/20" 
          : "py-5 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.img 
              src={logo} 
              alt="Hoch Online Real Estate" 
              className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
          </Link>

          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                  isScrolled
                    ? isActive(item.href)
                      ? "text-primary"
                      : "text-foreground hover:text-primary hover:bg-primary/5"
                    : isActive(item.href)
                      ? "text-primary"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            <a 
              href="tel:+233123456789" 
              className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-300 ${
                isScrolled 
                  ? "text-muted-foreground hover:text-primary" 
                  : "text-white/80 hover:text-white"
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>+233 123 456 789</span>
            </a>

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isScrolled ? "text-foreground" : "text-white"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="hidden xl:inline">{profile?.display_name || "Dashboard"}</span>
                </Link>
                <button
                  onClick={signOut}
                  className={`p-2 rounded-lg transition-colors ${
                    isScrolled ? "hover:bg-muted text-muted-foreground" : "hover:bg-white/10 text-white/70"
                  }`}
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button asChild size="sm" className="btn-primary group">
                <Link to="/auth">
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className={`lg:hidden ${isScrolled ? "text-foreground" : "text-white"}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden glass border-t border-border/50"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {navigation.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={item.href}
                    className={`block px-4 py-3 text-base font-medium rounded-xl transition-all duration-300 ${
                      isActive(item.href)
                        ? "text-primary bg-primary/10"
                        : "text-foreground hover:text-primary hover:bg-muted"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
              
              <motion.div 
                className="pt-4 border-t border-border/50 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{profile?.display_name || "Account"}</span>
                    </div>
                    <Button onClick={() => { signOut(); setIsMenuOpen(false); }} variant="outline" className="w-full">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="w-full btn-primary" onClick={() => setIsMenuOpen(false)}>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
