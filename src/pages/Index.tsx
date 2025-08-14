import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import StatsSection from "@/components/StatsSection";

const Index = () => {
  return (
    <div className="overflow-x-hidden">
      <HeroSection />
      <ServicesSection />
      <StatsSection />
    </div>
  );
};

export default Index;