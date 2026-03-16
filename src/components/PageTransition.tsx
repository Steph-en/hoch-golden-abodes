import { useEffect, useRef, ReactNode } from "react";
import gsap from "gsap";

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !overlayRef.current) return;

    const tl = gsap.timeline();

    // Overlay wipe out
    tl.fromTo(
      overlayRef.current,
      { scaleY: 1 },
      { scaleY: 0, duration: 0.8, ease: "power4.inOut", transformOrigin: "top" }
    );

    // Content fade in
    tl.fromTo(
      ref.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
      "-=0.4"
    );
  }, []);

  return (
    <div className="relative">
      {/* Page transition overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[100] bg-foreground pointer-events-none"
        style={{ transformOrigin: "top" }}
      />
      <div ref={ref}>{children}</div>
    </div>
  );
};

export default PageTransition;
