import { useEffect, useState } from "react";

const StatsSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  const stats = [
    { number: 120, label: "Active Listings", suffix: "+" },
    { number: 50, label: "Happy Clients", suffix: "+" },
    { number: 8, label: "Property Categories", suffix: "" },
    { number: 5, label: "Years Experience", suffix: "+" }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('stats-section');
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const AnimatedNumber = ({ value, suffix }: { value: number; suffix: string }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!isVisible) return;

      const duration = 2000;
      const increment = value / (duration / 16);
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, 16);

      return () => clearInterval(timer);
    }, [isVisible, value]);

    return (
      <span className="font-serif-luxury text-4xl md:text-5xl font-bold text-primary">
        {count}{suffix}
      </span>
    );
  };

  return (
    <section id="stats-section" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif-luxury text-3xl md:text-4xl font-bold text-foreground mb-4">
            Trusted by <span className="text-primary">Thousands</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our track record speaks for itself - delivering exceptional results across East Legon and Greater Accra
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="mb-2">
                <AnimatedNumber value={stat.number} suffix={stat.suffix} />
              </div>
              <p className="text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="gold-gradient-subtle rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="font-serif-luxury text-2xl font-semibold text-foreground mb-4">
              Ready to Find Your Dream Property?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join hundreds of satisfied clients who have found their perfect home with Hoch Online
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-gold px-8 py-3 rounded-lg font-medium transition-luxury">
                Browse Properties
              </button>
              <button className="btn-outline-gold px-8 py-3 rounded-lg font-medium transition-luxury">
                Schedule Consultation
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;