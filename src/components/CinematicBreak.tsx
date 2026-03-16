import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface CinematicBreakProps {
  words: string[];
  bgImage?: string;
}

const CinematicBreak = ({ words, bgImage }: CinematicBreakProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const wordEls = sectionRef.current.querySelectorAll(".cinematic-word");

    wordEls.forEach((word, i) => {
      gsap.fromTo(
        word,
        { opacity: 0, scale: 0.8, y: 40 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.2,
          ease: "power4.out",
          scrollTrigger: {
            trigger: word,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[60vh] flex items-center justify-center overflow-hidden"
    >
      {/* Dark background */}
      {bgImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-fixed"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="absolute inset-0 bg-black/70" />
        </>
      ) : (
        <div className="absolute inset-0 dark-gradient" />
      )}

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Cinematic words */}
      <div className="relative z-10 text-center px-4 space-y-4">
        {words.map((word, i) => (
          <div key={i} className="overflow-hidden">
            <h2
              className={`cinematic-word font-display tracking-tight ${
                i === 0
                  ? "text-5xl md:text-7xl lg:text-8xl font-bold text-gradient"
                  : i === words.length - 1
                  ? "text-lg md:text-xl text-white/40 font-sans tracking-widest uppercase"
                  : "text-4xl md:text-6xl lg:text-7xl font-semibold text-white"
              }`}
            >
              {word}
            </h2>
          </div>
        ))}
      </div>

      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
};

export default CinematicBreak;
