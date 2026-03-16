import { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";

const ScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const scaleY = useSpring(0, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? window.scrollY / totalHeight : 0;
      setScrollProgress(progress);
      scaleY.set(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scaleY]);

  // Don't render at very top
  if (scrollProgress < 0.01) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-1 z-50 pointer-events-none">
      <motion.div
        className="w-full bg-gradient-to-b from-primary via-primary to-primary/50 origin-top"
        style={{ scaleY, height: "100%" }}
      />
      {/* Glow dot at current position */}
      <motion.div
        className="absolute right-0 w-3 h-3 -translate-x-1 rounded-full bg-primary shadow-glow"
        style={{ top: `${scrollProgress * 100}%` }}
      />
    </div>
  );
};

export default ScrollProgress;
