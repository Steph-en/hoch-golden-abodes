import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      {/* Newsletter Section */}
      <div className="bg-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="font-serif-luxury text-2xl font-semibold text-primary-foreground mb-4">
            Stay Updated with Market Insights
          </h3>
          <p className="text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
            Get the latest real estate trends, property listings, and market analysis delivered to your inbox
          </p>
          <div className="max-w-md mx-auto flex gap-3">
            <Input
              type="email"
              placeholder="Enter your email address"
              className="bg-background text-foreground border-background/20"
            />
            <Button variant="secondary" className="whitespace-nowrap">
              Subscribe
            </Button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">H</span>
                </div>
                <span className="font-serif-luxury text-xl font-semibold">
                  Hoch Online
                </span>
              </div>
              <p className="text-background/80 mb-6 leading-relaxed">
                Premier real estate services in East Legon and Greater Accra. Your trusted partner for luxury properties, development, and architectural excellence.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-background/60 hover:text-primary transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-background/60 hover:text-primary transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-background/60 hover:text-primary transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-background/60 hover:text-primary transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link to="/" className="text-background/80 hover:text-primary transition-colors">Home</Link></li>
                <li><Link to="/about" className="text-background/80 hover:text-primary transition-colors">About Us</Link></li>
                <li><Link to="/explore" className="text-background/80 hover:text-primary transition-colors">Properties</Link></li>
                <li><Link to="/services" className="text-background/80 hover:text-primary transition-colors">Services</Link></li>
                <li><Link to="/contact" className="text-background/80 hover:text-primary transition-colors">Contact</Link></li>
                <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Blog</a></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Our Services</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Property Sales</a></li>
                <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Property Rentals</a></li>
                <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Development</a></li>
                <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Architecture</a></li>
                <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Interior Design</a></li>
                <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Property Management</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Contact Info</h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-background/80">East Legon, Accra</p>
                    <p className="text-background/80">Greater Accra Region, Ghana</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <a href="tel:+233123456789" className="text-background/80 hover:text-primary transition-colors">
                    +233 123 456 789
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                  <a href="mailto:info@hochonline.com" className="text-background/80 hover:text-primary transition-colors">
                    info@hochonline.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/20 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-background/60 text-sm">
              © {currentYear} Hoch Online Real Estate. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-background/60 hover:text-primary text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-background/60 hover:text-primary text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-background/60 hover:text-primary text-sm transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;