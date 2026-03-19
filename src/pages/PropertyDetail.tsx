import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Car, 
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  Mail,
  MessageSquare,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPropertyById, properties } from "@/data/properties";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [property, setProperty] = useState(getPropertyById(Number(id)));
  const [currentImage, setCurrentImage] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  // Pre-fill form if logged in
  useEffect(() => {
    if (user && profile) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || profile.display_name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || profile.phone || "",
      }));
    }
  }, [user, profile]);

  useEffect(() => {
    const prop = getPropertyById(Number(id));
    if (!prop) {
      navigate("/explore");
    } else {
      setProperty(prop);
      window.scrollTo(0, 0);
    }
  }, [id, navigate]);

  if (!property) {
    return null;
  }

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Inquiry Sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  const similarProperties = properties.filter(p => p.id !== property.id && p.type === property.type).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Full Screen Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <button
              onClick={() => setShowGallery(false)}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={prevImage}
              className="absolute left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            <img
              src={property.images[currentImage]}
              alt={property.title}
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {property.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentImage ? 'bg-primary' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Image Section */}
      <div className="relative h-[60vh] lg:h-[70vh]">
        <motion.img
          key={currentImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          src={property.images[currentImage]}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />

        {/* Navigation */}
        <div className="absolute top-24 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Properties</span>
            </Link>
            <div className="flex gap-3">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-3 rounded-full backdrop-blur-sm transition-colors ${
                  isLiked ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied!", description: "Property link copied to clipboard." });
                }}
                className="p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Image Gallery Controls */}
        <div className="absolute bottom-6 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between">
            <div className="flex gap-3">
              {property.images.slice(0, 4).map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImage ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <Button
              onClick={() => setShowGallery(true)}
              variant="outline"
              className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            >
              View All Photos
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {property.type}
                </span>
                {property.featured && (
                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    Featured
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">
                {property.title}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="text-lg">{property.location}</span>
              </div>
              <p className="font-display text-3xl md:text-4xl font-semibold text-primary mt-6">
                {property.price}
              </p>
            </div>

            {/* Property Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-muted/50 rounded-2xl">
              {property.beds > 0 && (
                <div className="text-center">
                  <Bed className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-display text-2xl font-semibold text-foreground">{property.beds}</p>
                  <p className="text-muted-foreground text-sm">Bedrooms</p>
                </div>
              )}
              {property.baths > 0 && (
                <div className="text-center">
                  <Bath className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-display text-2xl font-semibold text-foreground">{property.baths}</p>
                  <p className="text-muted-foreground text-sm">Bathrooms</p>
                </div>
              )}
              <div className="text-center">
                <Square className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-display text-2xl font-semibold text-foreground">{property.sqft}</p>
                <p className="text-muted-foreground text-sm">Sq. Feet</p>
              </div>
              <div className="text-center">
                <Car className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-display text-2xl font-semibold text-foreground">{property.parking}</p>
                <p className="text-muted-foreground text-sm">Parking</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-4">About This Property</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-6">Amenities & Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Property Details */}
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-6">Property Details</h2>
              <div className="grid grid-cols-2 gap-6 p-6 bg-muted/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Year Built</p>
                    <p className="font-semibold text-foreground">{property.yearBuilt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Square className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Property Size</p>
                    <p className="font-semibold text-foreground">{property.sqft} sq ft</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Inquiry Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 bg-card rounded-2xl p-8 shadow-xl-custom border border-border">
              <h3 className="font-display text-xl font-semibold text-foreground mb-6">Interested in This Property?</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-muted border-0"
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-muted border-0"
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-muted border-0"
                  />
                </div>
                <div>
                  <Textarea
                    placeholder={`I'm interested in ${property.title}...`}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="bg-muted border-0 resize-none"
                  />
                </div>
                <Button type="submit" className="w-full btn-primary py-6">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Send Inquiry
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border space-y-4">
                <a
                  href="tel:+233201234567"
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                >
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Call Us</p>
                    <p className="font-semibold text-foreground">+233 20 123 4567</p>
                  </div>
                </a>
                <a
                  href="mailto:info@hochonline.com"
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                >
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email Us</p>
                    <p className="font-semibold text-foreground">info@hochonline.com</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Properties */}
        {similarProperties.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display text-3xl font-semibold text-foreground mb-8">Similar Properties</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {similarProperties.map((prop) => (
                <Link
                  key={prop.id}
                  to={`/property/${prop.id}`}
                  className="group bg-card rounded-2xl overflow-hidden shadow-md-custom hover:shadow-xl-custom transition-all duration-500 hover:-translate-y-2"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={prop.image}
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute bottom-4 left-4">
                      <p className="text-xl font-display font-semibold text-white">{prop.price}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {prop.location}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {prop.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetail;
