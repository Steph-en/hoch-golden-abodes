import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CinematicTypography = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // "LUXURY" - letter by letter
      gsap.fromTo(
        ".typo-letter",
        { opacity: 0, y: 100, rotateY: -90 },
        {
          opacity: 1,
          y: 0,
          rotateY: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power4.out",
          scrollTrigger: {
            trigger: ".typo-section-1",
            start: "top 75%",
            toggleActions: "play none none none",
          },
        }
      );

      // "IS NOT A FEATURE" - words from different directions
      const wordDirections = [
        { x: -100, rotation: -5 },
        { x: 100, rotation: 5 },
        { x: -80, rotation: -3 },
        { x: 60, rotation: 3 },
      ];
      
      gsap.utils.toArray<Element>(".typo-word-slide").forEach((word, i) => {
        const dir = wordDirections[i % wordDirections.length];
        gsap.fromTo(
          word,
          { opacity: 0, x: dir.x, rotation: dir.rotation },
          {
            opacity: 1,
            x: 0,
            rotation: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: word,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // "IT'S A LIFESTYLE" - scale up dramatically
      gsap.fromTo(
        ".typo-scale",
        { opacity: 0, scale: 0.3, letterSpacing: "0.5em" },
        {
          opacity: 1,
          scale: 1,
          letterSpacing: "0.05em",
          duration: 1.5,
          ease: "power4.out",
          scrollTrigger: {
            trigger: ".typo-section-3",
            start: "top 75%",
            toggleActions: "play none none none",
          },
        }
      );

      // Giant scroll text
      gsap.fromTo(
        ".typo-giant",
        { xPercent: 20, opacity: 0.1 },
        {
          xPercent: -20,
          opacity: 0.3,
          ease: "none",
          scrollTrigger: {
            trigger: ".typo-giant-container",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="overflow-hidden">
      {/* Section 1: Letter-by-letter reveal */}
      <section className="typo-section-1 relative min-h-[50vh] flex items-center justify-center dark-gradient">
        <div className="text-center" style={{ perspective: "1000px" }}>
          <div className="flex justify-center flex-wrap">
            {"LUXURY".split("").map((letter, i) => (
              <span
                key={i}
                className="typo-letter inline-block font-display text-6xl md:text-8xl lg:text-[10rem] font-bold text-gradient"
                style={{ display: "inline-block" }}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Words from different directions */}
      <section className="typo-section-2 relative min-h-[40vh] flex items-center justify-center bg-background">
        <div className="text-center space-y-2 px-4">
          {["IS", "NOT", "A", "FEATURE"].map((word, i) => (
            <div key={i} className="overflow-hidden">
              <span className="typo-word-slide inline-block font-display text-3xl md:text-5xl lg:text-6xl font-semibold text-foreground">
                {word}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Scale up */}
      <section className="typo-section-3 relative min-h-[50vh] flex items-center justify-center dark-gradient">
        <h2 className="typo-scale font-display text-4xl md:text-7xl lg:text-9xl font-bold text-white text-center">
          IT'S A <span className="text-gradient">LIFESTYLE</span>
        </h2>
      </section>

      {/* Giant scroll text background */}
      <section className="typo-giant-container relative py-20 bg-background overflow-hidden">
        <div className="typo-giant whitespace-nowrap">
          <span className="font-display text-[8rem] md:text-[12rem] lg:text-[16rem] font-bold text-foreground/5 select-none">
            LIVE ELEVATED • LIVE ELEVATED •
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">The Promise</p>
            <h3 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
              Experience the Extraordinary
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every detail crafted for those who demand nothing less than perfection
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CinematicTypography;
