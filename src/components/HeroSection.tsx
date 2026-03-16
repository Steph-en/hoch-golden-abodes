import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import heroProperty1 from "@/assets/hero-property-1.jpg";
import heroProperty2 from "@/assets/hero-property-2.jpg";
import heroProperty3 from "@/assets/hero-property-3.jpg";
import PropertySearch from "./PropertySearch";

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [textRevealed, setTextRevealed] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const heroImages = [
    {
      src: heroProperty1,
      lines: ["Welcome to", "Hoch", "Where Luxury Meets Home"],
      description: "Discover luxury properties and exclusive real estate opportunities across Accra's most prestigious neighborhoods",
    },
    {
      src: heroProperty2,
      lines: ["Premium Living", "Redefined", "Experience True Elegance"],
      description: "Contemporary apartments and penthouses with panoramic city views and world-class amenities",
    },
    {
      src: heroProperty3,
      lines: ["Invest in", "Excellence", "Build Lasting Wealth"],
      description: "Strategic real estate investments with exceptional returns in Ghana's thriving property market",
    },
  ];

  // Dramatic hero entrance with word-by-word reveal
  useEffect(() => {
    if (!heroRef.current) return;

    const tl = gsap.timeline({ delay: 0.5 });

    // Badge entrance
    tl.fromTo(
      ".hero-badge",
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    );

    // Word-by-word title reveal with dramatic pauses
    const words = heroRef.current.querySelectorAll(".hero-word");
    words.forEach((word, i) => {
      tl.fromTo(
        word,
        {
          y: 120,
          opacity: 0,
          rotateX: -45,
          skewY: 3,
        },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          skewY: 0,
          duration: 1,
          ease: "power4.out",
        },
        i === 0 ? "+=0.1" : "-=0.4"
      );
    });

    // Description fade in
    tl.fromTo(
      ".hero-description",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
      "-=0.5"
    );

    // Search bar slides up
    tl.fromTo(
      ".hero-search",
      { y: 60, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 1, ease: "power3.out" },
      "-=0.4"
    );

    // Stats stagger in
    tl.fromTo(
      ".hero-stat",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: "power3.out" },
      "-=0.5"
    );

    tl.call(() => setTextRevealed(true));

    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);

  return (
    <section ref={heroRef} className="relative h-screen min-h-[750px] overflow-hidden">
      {/* Background Image with Ken Burns effect */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          {heroImages.map(
            (image, index) =>
              index === currentSlide && (
                <motion.div
                  key={index}
                  initial={{ scale: 1.15, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.05, opacity: 0 }}
                  transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0"
                >
                  <img
                    src={image.src}
                    alt="Luxury property"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              )
          )}
        </AnimatePresence>
        {/* Cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      {/* Decorative lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent z-10" />
      <div className="absolute bottom-0 left-0 w-1/3 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent z-20" />

      {/* Navigation Arrows */}
      <div className="absolute left-6 lg:left-12 top-1/2 -translate-y-1/2 z-20">
        <motion.button
          onClick={prevSlide}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-full bg-white/5 hover:bg-white/15 backdrop-blur-md text-white transition-all duration-500 border border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
      </div>
      <div className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 z-20">
        <motion.button
          onClick={nextSlide}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-full bg-white/5 hover:bg-white/15 backdrop-blur-md text-white transition-all duration-500 border border-white/10"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="hero-badge inline-flex items-center space-x-2 mb-8 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 opacity-0">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white/80 tracking-wider uppercase">
                East Legon, Accra • Ghana
              </span>
            </div>

            {/* Cinematic Title — word by word */}
            <div ref={titleRef} className="mb-6" style={{ perspective: "1000px" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {heroImages[currentSlide].lines.map((line, lineIdx) => (
                    <div key={lineIdx} className="overflow-hidden">
                      <h1
                        className={`hero-word font-display leading-[0.95] tracking-tight opacity-0 ${
                          lineIdx === 1
                            ? "text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-gradient my-2"
                            : "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white"
                        }`}
                      >
                        {line}
                      </h1>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Description */}
            <p className="hero-description text-lg md:text-xl text-white/60 mb-10 max-w-xl leading-relaxed opacity-0">
              {heroImages[currentSlide].description}
            </p>

            {/* Search */}
            <div className="hero-search opacity-0">
              <PropertySearch />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-10 mt-14 pt-8 border-t border-white/10">
              {[
                { value: "120+", label: "Properties" },
                { value: "50+", label: "Happy Clients" },
                { value: "5+", label: "Years" },
              ].map((stat, i) => (
                <div key={i} className="hero-stat opacity-0">
                  <p className="font-display text-3xl lg:text-4xl font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-3">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`relative h-1 rounded-full transition-all duration-700 overflow-hidden ${
              index === currentSlide ? "w-16 bg-primary" : "w-4 bg-white/20 hover:bg-white/40"
            }`}
          >
            {index === currentSlide && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 7, ease: "linear" }}
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
        transition={{ delay: 3, duration: 1 }}
        className="absolute bottom-10 right-10 z-20 hidden lg:flex flex-col items-center gap-3"
      >
        <span className="text-[10px] text-white/30 uppercase tracking-[0.3em] rotate-90 origin-center translate-x-4">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-9 rounded-full border border-white/20 flex items-start justify-center p-1.5"
        >
          <motion.div className="w-1 h-1 rounded-full bg-primary" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
