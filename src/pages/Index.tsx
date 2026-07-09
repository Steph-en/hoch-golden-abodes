import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/HeroSection";
import ScrollVideoHero from "@/components/ScrollVideoHero";
import ServicesSection from "@/components/ServicesSection";
import StatsSection from "@/components/StatsSection";
import FeaturedProperties from "@/components/FeaturedProperties";
import TestimonialsSection from "@/components/TestimonialsSection";
import WhyChooseUs from "@/components/WhyChooseUs";
import CinematicBreak from "@/components/CinematicBreak";
import StorytellingSection from "@/components/StorytellingSection";
import CinematicTypography from "@/components/CinematicTypography";
import PropertyReveal3D from "@/components/PropertyReveal3D";
import Preloader from "@/components/Preloader";
import SEO from "@/components/SEO";
import heroProperty1 from "@/assets/hero-property-1.jpg";
import heroProperty2 from "@/assets/hero-property-2.jpg";
import heroProperty3 from "@/assets/hero-property-3.jpg";

const Index = () => {
  const [loaded, setLoaded] = useState(false);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const handlePreloaderComplete = useCallback(() => setLoaded(true), []);

  useEffect(() => {
    async function loadProperties() {
      const { data, error } = await supabase.from("properties").select("id,name").limit(5);

      if (error) {
        console.error("Supabase query error:", error);
        return;
      }

      setPropertyCount(data?.length ?? 0);
    }

    loadProperties();
  }, []);

  return (
    <div className="overflow-x-hidden">
      <SEO
        title="Hoch Online | Luxury Real Estate in East Legon, Accra"
        description="Discover luxury homes, villas and premium real estate in East Legon, Accra. Bespoke development, architecture and sales by Hoch Online."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Hoch Online Real Estate",
          url: "https://www.hochonline.org",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.hochonline.org/explore?search={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      {!loaded && <Preloader onComplete={handlePreloaderComplete} />}
      <HeroSection />

      {propertyCount !== null && (
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          Loaded {propertyCount} properties from Supabase.
        </div>
      )}

      {/* Scroll-controlled cinematic video */}
      {/* <ScrollVideoHero /> */}

      {/* Cinematic Typography Transitions */}
      {/* <CinematicTypography /> */}

      {/* Storytelling: Luxury lifestyle */}
      <StorytellingSection
        lines={[
          "Our Philosophy",
          "Luxury is not a feature.",
          "It's a lifestyle.",
          "We believe every home should tell a story — one of comfort, ambition, and timeless elegance. That's why we curate only the most exceptional properties across Ghana.",
        ]}
        image={heroProperty1}
      />

      <FeaturedProperties />

      {/* 3D Property Reveal */}
      <PropertyReveal3D />

      {/* Cinematic Break */}
      <CinematicBreak
        words={["Designed for Comfort", "Built for Prestige"]}
        bgImage={heroProperty2}
      />

      {/* <WhyChooseUs /> */}
      {/* <ServicesSection /> */}

      {/* Storytelling: Investment */}
      <StorytellingSection
        lines={[
          "Smart Investments",
          "Find your dream property",
          "in the most desirable locations.",
          "Ghana's real estate market offers exceptional returns for discerning investors. Our expert team identifies high-growth opportunities that deliver lasting value and generational wealth.",
        ]}
        image={heroProperty3}
        reverse
      />

      {/* <StatsSection /> */}
      {/* <TestimonialsSection /> */}
    </div>
  );
};

export default Index;
