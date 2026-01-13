import { useRef } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Users, Home, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const StatsSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const stats = [
    { 
      icon: Home,
      number: 120, 
      label: "Properties Listed", 
      suffix: "+",
      description: "Exclusive listings across Ghana"
    },
    { 
      icon: Users,
      number: 50, 
      label: "Happy Clients", 
      suffix: "+",
      description: "Satisfied homeowners"
    },
    { 
      icon: Award,
      number: 8, 
      label: "Property Categories", 
      suffix: "",
      description: "Diverse portfolio options"
    },
    { 
      icon: Clock,
      number: 5, 
      label: "Years Experience", 
      suffix: "+",
      description: "Industry expertise"
    }
  ];

  const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
    const spring = useSpring(0, { 
      stiffness: 50, 
      damping: 30
    });

    const display = useTransform(spring, (latest) => Math.floor(latest).toString());

    if (isInView) {
      spring.set(value);
    }

    return (
      <span className="stat-number">
        <motion.span>{display}</motion.span>
        {suffix}
      </span>
    );
  };

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 dark-gradient relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-2xl" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary mb-4">
            Our Track Record
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-6">
            Trusted by <span className="text-gradient">Thousands</span>
            <br className="hidden sm:block" />
            Across Ghana
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Our commitment to excellence has earned us the trust of clients throughout East Legon and Greater Accra
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
              className="relative group"
            >
              <div className="relative p-6 lg:p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-500">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                
                {/* Number */}
                <div className="mb-2">
                  <AnimatedNumber value={stat.number} suffix={stat.suffix} />
                </div>
                
                {/* Label */}
                <p className="text-white font-medium mb-1">{stat.label}</p>
                <p className="text-white/40 text-sm">{stat.description}</p>

                {/* Hover decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          
          <div className="relative p-8 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="font-display text-2xl lg:text-3xl font-semibold text-white mb-3">
                Ready to Find Your Dream Property?
              </h3>
              <p className="text-white/60 max-w-xl">
                Join hundreds of satisfied clients who have found their perfect home with Hoch Online
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="btn-primary px-8 py-6 group">
                <Link to="/explore">
                  Browse Properties
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button 
                asChild
                size="lg" 
                variant="outline"
                className="px-8 py-6 border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50"
              >
                <Link to="/contact">
                  Schedule Consultation
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
