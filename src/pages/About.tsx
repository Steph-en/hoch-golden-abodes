import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Award, MapPin, Clock } from "lucide-react";

const About = () => {
  const teamMembers = [
    {
      name: "Sarah Mensah",
      role: "Founder & CEO",
      description: "15+ years in luxury real estate and development",
      image: "https://images.unsplash.com/photo-1494790108755-2616b67b8f7e?w=400&h=400&fit=crop&crop=face"
    },
    {
      name: "Kwame Asante",
      role: "Head of Architecture",
      description: "Award-winning architect specializing in contemporary design",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
    },
    {
      name: "Ama Osei",
      role: "Sales Director",
      description: "Expert in luxury property sales and client relations",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face"
    }
  ];

  const values = [
    {
      icon: Award,
      title: "Excellence",
      description: "We deliver exceptional quality in every project and service"
    },
    {
      icon: Users,
      title: "Client-Focused",
      description: "Your satisfaction and success are our top priorities"
    },
    {
      icon: MapPin,
      title: "Local Expertise",
      description: "Deep knowledge of East Legon and Greater Accra markets"
    },
    {
      icon: Clock,
      title: "Timely Delivery",
      description: "We respect your time and deliver on our promises"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif-luxury text-4xl md:text-5xl font-bold text-foreground mb-6">
            About <span className="text-primary">Hoch Online</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Founded on the principles of excellence and innovation, Hoch Online has established itself as a premier 
            real estate company in East Legon and Greater Accra, delivering exceptional properties and unparalleled service.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif-luxury text-3xl font-bold text-foreground mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Hoch Online was born from a vision to transform the real estate landscape in Ghana. 
                  We recognized the need for a company that combines international standards with 
                  local expertise, creating exceptional living spaces that reflect the aspirations 
                  of modern Ghanaians.
                </p>
                <p>
                  From our headquarters in East Legon, we've grown to become a trusted name in 
                  luxury real estate, development, and architectural services. Our team of experts 
                  brings together decades of experience in creating homes that are not just 
                  beautiful, but truly livable.
                </p>
                <p>
                  Today, we continue to push boundaries, embracing new technologies and sustainable 
                  practices while maintaining our commitment to craftsmanship and client satisfaction.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="gold-gradient-subtle rounded-2xl p-8">
                <h3 className="font-serif-luxury text-2xl font-semibold text-foreground mb-4">
                  Our Mission
                </h3>
                <p className="text-muted-foreground mb-6">
                  To create exceptional living spaces and provide unparalleled real estate services 
                  that exceed expectations and enhance the lives of our clients.
                </p>
                <h3 className="font-serif-luxury text-2xl font-semibold text-foreground mb-4">
                  Our Vision
                </h3>
                <p className="text-muted-foreground">
                  To be the leading real estate company in Ghana, recognized for innovation, 
                  quality, and our commitment to sustainable development.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our <span className="text-primary">Core Values</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center h-full">
                <CardContent className="p-6">
                  <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-3">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-foreground mb-4">
              Meet Our <span className="text-primary">Expert Team</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experienced professionals dedicated to your success
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="text-center overflow-hidden">
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-serif-luxury text-xl font-semibold text-foreground mb-2">
                    {member.name}
                  </h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="btn-gold px-8 py-3">
              Join Our Team
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;