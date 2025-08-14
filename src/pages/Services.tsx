import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, PenTool, Users, Home, Palette, Calculator, CheckCircle } from "lucide-react";

const Services = () => {
  const mainServices = [
    {
      icon: Building2,
      title: "Development & Construction",
      description: "From concept to completion, we deliver exceptional residential and commercial developments with the highest standards of quality and craftsmanship.",
      features: [
        "Custom residential development",
        "Commercial property construction",
        "Project management & oversight",
        "Quality assurance & inspections",
        "Sustainable building practices",
        "Timely delivery guarantee"
      ],
      process: [
        "Initial consultation & site analysis",
        "Design development & planning permits",
        "Construction phase management",
        "Quality control & final inspections",
        "Handover & warranty support"
      ]
    },
    {
      icon: PenTool,
      title: "Architecture & Interior Design",
      description: "Our award-winning design team creates stunning spaces that blend functionality with aesthetic excellence, tailored to your lifestyle and preferences.",
      features: [
        "Architectural planning & design",
        "Interior design & space planning",
        "3D visualization & rendering",
        "Sustainable design solutions",
        "Smart home integration",
        "Luxury finishing coordination"
      ],
      process: [
        "Design brief & concept development",
        "Detailed architectural drawings",
        "Interior design schemes",
        "3D visualization & approval",
        "Implementation & supervision"
      ]
    },
    {
      icon: Users,
      title: "Sales, Leasing & Consultancy",
      description: "Expert guidance through every step of your real estate journey, from property selection to closing, ensuring the best outcomes for our clients.",
      features: [
        "Property sales & acquisition",
        "Rental management services",
        "Investment advisory",
        "Market analysis & valuation",
        "Legal support coordination",
        "After-sales support"
      ],
      process: [
        "Needs assessment & consultation",
        "Property matching & viewing",
        "Negotiation & legal support",
        "Transaction completion",
        "Ongoing client support"
      ]
    }
  ];

  const additionalServices = [
    {
      icon: Home,
      title: "Property Management",
      description: "Comprehensive property management services for investors and landlords"
    },
    {
      icon: Palette,
      title: "Renovation & Remodeling",
      description: "Transform existing spaces with our expert renovation services"
    },
    {
      icon: Calculator,
      title: "Real Estate Investment",
      description: "Strategic investment advice and portfolio management"
    }
  ];

  return (
    <div className="min-h-screen py-8">
      {/* Hero Section */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif-luxury text-4xl md:text-5xl font-bold text-foreground mb-6">
            Our <span className="text-primary">Premium Services</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Comprehensive real estate solutions designed to exceed expectations and deliver exceptional value. 
            From luxury property development to expert sales consultancy, we're your trusted partner in real estate.
          </p>
        </div>
      </section>

      {/* Main Services */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {mainServices.map((service, index) => (
              <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}>
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mr-4">
                      <service.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h2 className="font-serif-luxury text-3xl font-bold text-foreground">
                      {service.title}
                    </h2>
                  </div>
                  
                  <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                    {service.description}
                  </p>

                  <div className="mb-8">
                    <h3 className="font-semibold text-foreground mb-4 text-lg">Key Features:</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {service.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button size="lg" className="btn-gold px-8">
                    Learn More
                  </Button>
                </div>

                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <Card className="bg-secondary border-border">
                    <CardContent className="p-8">
                      <h3 className="font-serif-luxury text-xl font-semibold text-foreground mb-6">
                        Our Process
                      </h3>
                      <div className="space-y-4">
                        {service.process.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold mr-4 flex-shrink-0 mt-1">
                              {stepIndex + 1}
                            </div>
                            <p className="text-muted-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Services */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-foreground mb-4">
              Additional <span className="text-primary">Services</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Extending our expertise to meet all your real estate needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {additionalServices.map((service, index) => (
              <Card key={index} className="text-center h-full hover:shadow-gold transition-all duration-300">
                <CardContent className="p-8">
                  <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <service.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="font-serif-luxury text-xl font-semibold text-foreground mb-4">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {service.description}
                  </p>
                  <Button variant="outline" className="w-full">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="gold-gradient-subtle rounded-3xl p-12 text-center">
            <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Start Your Project?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Contact our expert team today for a free consultation and discover how we can bring your real estate vision to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="btn-gold px-8 py-3">
                Schedule Consultation
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-3">
                View Portfolio
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;