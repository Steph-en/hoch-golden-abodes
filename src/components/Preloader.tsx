import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import logo from "@/assets/logo.png";

interface PreloaderProps {
  onComplete: () => void;
}

const Preloader = ({ onComplete }: PreloaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const lineLeftRef = useRef<HTMLDivElement>(null);
  const lineRightRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !logoRef.current) return;

    const tl = gsap.timeline({
      onComplete: () => {
        onComplete();
      },
    });

    // Logo reveal
    tl.fromTo(
      logoRef.current,
      { scale: 0.6, opacity: 0, rotateY: -90 },
      { scale: 1, opacity: 1, rotateY: 0, duration: 1.2, ease: "power4.out" }
    );

    // Decorative lines expand
    tl.fromTo(
      [lineLeftRef.current, lineRightRef.current],
      { scaleX: 0 },
      { scaleX: 1, duration: 0.6, ease: "power3.out" },
      "-=0.4"
    );

    // Tagline fade in
    tl.fromTo(
      taglineRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
      "-=0.3"
    );

    // Hold
    tl.to({}, { duration: 0.6 });

    // Exit: everything fades out + container wipes up
    tl.to(
      [logoRef.current, lineLeftRef.current, lineRightRef.current, taglineRef.current],
      { opacity: 0, y: -30, duration: 0.5, ease: "power3.in", stagger: 0.05 }
    );

    tl.to(containerRef.current, {
      yPercent: -100,
      duration: 0.8,
      ease: "power4.inOut",
    });

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center"
      style={{ perspective: "800px" }}
    >
      <img
        ref={logoRef}
        src={logo}
        alt="Hoch"
        className="w-28 h-28 md:w-36 md:h-36 object-contain opacity-0"
      />

      <div className="flex items-center gap-4 mt-6 w-64">
        <div
          ref={lineLeftRef}
          className="flex-1 h-px bg-gradient-to-r from-transparent to-primary origin-right"
          style={{ transform: "scaleX(0)" }}
        />
        <div
          ref={lineRightRef}
          className="flex-1 h-px bg-gradient-to-l from-transparent to-primary origin-left"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      <div ref={taglineRef} className="mt-4 opacity-0">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Where Luxury Meets Home
        </p>
      </div>
    </div>
  );
};

export default Preloader;
