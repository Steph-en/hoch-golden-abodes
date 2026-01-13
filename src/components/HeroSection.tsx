import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, ArrowRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import heroProperty1 from "@/assets/hero-property-1.jpg";
import heroProperty2 from "@/assets/hero-property-2.jpg";
import heroProperty3 from "@/assets/hero-property-3.jpg";

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const heroImages = [
    {
      src: heroProperty1,
      title: "Find Your Dream Home",
      subtitle: "in Ghana",
      description: "Discover luxury properties and exclusive real estate opportunities across Accra's most prestigious neighborhoods"
    },
    {
      src: heroProperty2,
      title: "Premium Living",
      subtitle: "Redefined",
      description: "Contemporary apartments and penthouses with panoramic city views and world-class amenities"
    },
    {
      src: heroProperty3,
      title: "Invest in Excellence",
      subtitle: "Build Wealth",
      description: "Strategic real estate investments with exceptional returns in Ghana's thriving property market"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  return (
    <section className="relative h-screen min-h-[700px] overflow-hidden">
      {/* Background Image Slider */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          {heroImages.map((image, index) => (
            index === currentSlide && (
              <motion.div
                key={index}
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.05, opacity: 0 }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0"
              >
                <img
                  src={image.src}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )
          ))}
        </AnimatePresence>
        <div className="hero-overlay" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background/30 to-transparent z-10" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent z-20" />

      {/* Navigation Arrows */}
      <div className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20">
        <motion.button
          onClick={prevSlide}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-300 border border-white/20"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
      </div>
      <div className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20">
        <motion.button
          onClick={nextSlide}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-300 border border-white/20"
        >
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            {/* Location Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center space-x-2 mb-6 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white/90">East Legon, Accra • Ghana</span>
            </motion.div>

            {/* Main Heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.1] mb-4">
                  {heroImages[currentSlide].title}
                  <br />
                  <span className="text-gradient">{heroImages[currentSlide].subtitle}</span>
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl leading-relaxed">
                  {heroImages[currentSlide].description}
                </p>
              </motion.div>
            </AnimatePresence>
            
            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                size="lg" 
                className="btn-primary text-base px-8 py-6 group"
              >
                Explore Properties
                <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-6 text-base border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 backdrop-blur-sm group"
              >
                <Play className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:scale-110" />
                Watch Video
              </Button>
            </motion.div>

            {/* Stats Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex items-center gap-8 mt-12 pt-8 border-t border-white/20"
            >
              <div>
                <p className="font-display text-3xl font-semibold text-white">120+</p>
                <p className="text-sm text-white/60">Properties Listed</p>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <p className="font-display text-3xl font-semibold text-white">50+</p>
                <p className="text-sm text-white/60">Happy Clients</p>
              </div>
              <div className="w-px h-12 bg-white/20 hidden sm:block" />
              <div className="hidden sm:block">
                <p className="font-display text-3xl font-semibold text-white">5+</p>
                <p className="text-sm text-white/60">Years Experience</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-3">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`relative h-1.5 rounded-full transition-all duration-500 overflow-hidden ${
              index === currentSlide ? "w-12 bg-primary" : "w-6 bg-white/30 hover:bg-white/50"
            }`}
          >
            {index === currentSlide && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 6, ease: "linear" }}
                className="absolute inset-0 bg-primary/50 origin-left"
              />
            )}
          </button>
        ))}
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 right-8 z-20 hidden lg:flex flex-col items-center space-y-2"
      >
        <span className="text-xs text-white/50 uppercase tracking-widest rotate-90 origin-center translate-x-4">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1"
        >
          <motion.div className="w-1.5 h-1.5 rounded-full bg-white/80" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
