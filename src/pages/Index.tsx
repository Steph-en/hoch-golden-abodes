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
import heroProperty1 from "@/assets/hero-property-1.jpg";
import heroProperty2 from "@/assets/hero-property-2.jpg";
import heroProperty3 from "@/assets/hero-property-3.jpg";

const Index = () => {
  return (
    <div className="overflow-x-hidden">
      <HeroSection />

      {/* Scroll-controlled cinematic video */}
      <ScrollVideoHero />

      {/* Cinematic Typography Transitions */}
      <CinematicTypography />

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

      <WhyChooseUs />
      <ServicesSection />

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

      <StatsSection />
      <TestimonialsSection />
    </div>
  );
};

export default Index;
