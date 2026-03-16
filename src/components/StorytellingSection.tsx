import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface StorySectionProps {
  lines: string[];
  image: string;
  reverse?: boolean;
}

const StorytellingSection = ({ lines, image, reverse = false }: StorySectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !imageRef.current) return;

    const textEls = sectionRef.current.querySelectorAll(".story-line");

    // Parallax on image
    gsap.to(imageRef.current, {
      yPercent: -15,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    // Image zoom on scroll
    gsap.fromTo(
      imageRef.current.querySelector("img"),
      { scale: 1.2 },
      {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );

    // Staggered text reveal
    textEls.forEach((el, i) => {
      gsap.fromTo(
        el,
        {
          opacity: 0,
          y: 60,
          x: reverse ? 40 : -40,
        },
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [reverse]);

  return (
    <section ref={sectionRef} className="relative py-32 lg:py-40 overflow-hidden">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center ${reverse ? "lg:direction-rtl" : ""}`}>
        {/* Image side */}
        <div className={`relative overflow-hidden rounded-2xl h-[500px] lg:h-[600px] ${reverse ? "lg:order-2" : ""}`}>
          <div ref={imageRef} className="absolute inset-0">
            <img
              src={image}
              alt="Luxury property"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          {/* Decorative corner */}
          <div className="absolute top-6 left-6 w-16 h-16 border-l-2 border-t-2 border-primary/50" />
          <div className="absolute bottom-6 right-6 w-16 h-16 border-r-2 border-b-2 border-primary/50" />
        </div>

        {/* Text side */}
        <div className={`space-y-6 ${reverse ? "lg:order-1 lg:text-right" : ""}`}>
          {lines.map((line, i) => (
            <div key={i} className="overflow-hidden">
              <p
                className={`story-line ${
                  i === 0
                    ? "text-xs uppercase tracking-[0.3em] text-primary font-medium"
                    : i <= 2
                    ? "font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight"
                    : "text-lg text-muted-foreground leading-relaxed"
                }`}
              >
                {line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StorytellingSection;
