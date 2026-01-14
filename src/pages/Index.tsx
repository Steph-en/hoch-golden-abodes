import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import StatsSection from "@/components/StatsSection";
import FeaturedProperties from "@/components/FeaturedProperties";
import TestimonialsSection from "@/components/TestimonialsSection";

const Index = () => {
  return (
    <div className="overflow-x-hidden">
      <HeroSection />
      <FeaturedProperties />
      <ServicesSection />
      <StatsSection />
      <TestimonialsSection />
    </div>
  );
};

export default Index;