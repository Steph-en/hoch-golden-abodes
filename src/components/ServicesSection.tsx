import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, PenTool, Users, ArrowRight } from "lucide-react";

const ServicesSection = () => {
  const services = [
    {
      icon: Building2,
      title: "Development & Construction",
      description: "From concept to completion, we deliver exceptional residential and commercial developments with the highest standards of quality and craftsmanship.",
      features: ["Custom home design", "Commercial development", "Project management", "Quality assurance"],
      color: "text-blue-600"
    },
    {
      icon: PenTool,
      title: "Architecture & Interior Design",
      description: "Our award-winning design team creates stunning spaces that blend functionality with aesthetic excellence, tailored to your lifestyle and preferences.",
      features: ["Architectural planning", "Interior design", "3D visualization", "Sustainable design"],
      color: "text-green-600"
    },
    {
      icon: Users,
      title: "Sales, Leasing & Consultancy",
      description: "Expert guidance through every step of your real estate journey, from property selection to closing, ensuring the best outcomes for our clients.",
      features: ["Property sales", "Rental management", "Investment advice", "Market analysis"],
      color: "text-purple-600"
    }
  ];

  return (
    <section className="py-20 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our <span className="text-primary">Premium Services</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive real estate solutions designed to exceed expectations and deliver exceptional value
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="service-card h-full bg-background border-border">
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4`}>
                    <service.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-serif-luxury text-xl font-semibold text-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-foreground mb-3">Key Features:</h4>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mr-3" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button variant="outline" className="w-full group">
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="btn-gold px-8 py-3">
            View All Services
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;