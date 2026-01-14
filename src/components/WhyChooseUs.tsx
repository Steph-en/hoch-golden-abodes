import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, Award, Users, TrendingUp, Clock, Headphones } from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Trusted & Secure",
    description: "All our properties are legally verified with proper documentation ensuring your investment is protected.",
  },
  {
    icon: Award,
    title: "Premium Quality",
    description: "We curate only the finest properties that meet our rigorous standards for quality and value.",
  },
  {
    icon: Users,
    title: "Expert Team",
    description: "Our seasoned professionals bring decades of combined experience in Ghana's real estate market.",
  },
  {
    icon: TrendingUp,
    title: "Smart Investment",
    description: "Strategic guidance to maximize your returns with properties in high-growth areas.",
  },
  {
    icon: Clock,
    title: "Efficient Process",
    description: "Streamlined transactions with transparent communication every step of the way.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Dedicated support team available around the clock to address your queries and concerns.",
  },
];

const WhyChooseUs = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const },
    },
  };

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary)) 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, hsl(var(--primary)) 2px, transparent 2px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-primary/10 to-transparent opacity-50 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-radial from-primary/10 to-transparent opacity-50 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
            Your Trusted Partner in
            <br />
            <span className="text-gradient">Ghana Real Estate</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            With years of experience and a passion for excellence, we've helped hundreds of clients 
            find their perfect property in Ghana
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative bg-card rounded-2xl p-8 shadow-md-custom hover:shadow-xl-custom transition-all duration-500 hover:-translate-y-2 border border-border/50"
            >
              {/* Icon Container */}
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <benefit.icon className="w-8 h-8 text-primary" />
                </div>
                {/* Decorative glow */}
                <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
              </div>

              {/* Content */}
              <h3 className="font-display text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute top-4 right-4 w-2 h-8 bg-gradient-to-b from-primary/30 to-transparent rounded-full" />
                <div className="absolute top-4 right-4 w-8 h-2 bg-gradient-to-r from-primary/30 to-transparent rounded-full" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 bg-gradient-to-r from-foreground via-foreground/95 to-foreground rounded-3xl p-8 md:p-12 relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/20 to-transparent" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-radial from-primary/10 to-transparent" />
          </div>

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="font-display text-4xl md:text-5xl font-semibold text-primary mb-2">99%</p>
              <p className="text-white/70 text-sm md:text-base">Client Satisfaction</p>
            </div>
            <div>
              <p className="font-display text-4xl md:text-5xl font-semibold text-primary mb-2">500+</p>
              <p className="text-white/70 text-sm md:text-base">Properties Sold</p>
            </div>
            <div>
              <p className="font-display text-4xl md:text-5xl font-semibold text-primary mb-2">15+</p>
              <p className="text-white/70 text-sm md:text-base">Years Experience</p>
            </div>
            <div>
              <p className="font-display text-4xl md:text-5xl font-semibold text-primary mb-2">24/7</p>
              <p className="text-white/70 text-sm md:text-base">Customer Support</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
