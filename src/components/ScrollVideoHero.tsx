import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

const PLACEHOLDER_VIDEO = "https://videos.pexels.com/video-files/4571563/4571563-uhd_2560_1440_25fps.mp4";

interface TextOverlay {
  text: string;
  startProgress: number;
  endProgress: number;
}

const overlays: TextOverlay[] = [
  { text: "Welcome to Elevated Living", startProgress: 0, endProgress: 0.2 },
  { text: "Where Architecture Meets Lifestyle", startProgress: 0.25, endProgress: 0.45 },
  { text: "Discover Golden Abodes", startProgress: 0.55, endProgress: 0.75 },
  { text: "Your Future Begins Here", startProgress: 0.8, endProgress: 1.0 },
];

const ScrollVideoHero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeOverlay, setActiveOverlay] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Wait for video metadata to load
    const onLoaded = () => {
      const st = ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        pin: false,
        onUpdate: (self) => {
          const progress = self.progress;
          setScrollProgress(progress);

          // Control video playback based on scroll
          if (video.duration) {
            video.currentTime = progress * video.duration;
          }

          // Determine active overlay
          const activeIdx = overlays.findIndex(
            (o) => progress >= o.startProgress && progress <= o.endProgress
          );
          setActiveOverlay(activeIdx);
        },
      });

      return () => st.kill();
    };

    if (video.readyState >= 1) {
      onLoaded();
    } else {
      video.addEventListener("loadedmetadata", onLoaded);
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="relative" style={{ height: "400vh" }}>
      {/* Sticky video container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <video
          ref={videoRef}
          src={PLACEHOLDER_VIDEO}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />

        {/* Text overlays */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          {overlays.map((overlay, i) => {
            const isActive = i === activeOverlay;
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  y: isActive ? 0 : 30,
                  scale: isActive ? 1 : 0.95,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute text-center max-w-4xl"
              >
                <h2 className="font-display text-4xl md:text-6xl lg:text-8xl font-bold text-white leading-tight">
                  {overlay.text}
                </h2>
              </motion.div>
            );
          })}
        </div>

        {/* Scroll progress dots */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          {overlays.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i === activeOverlay
                  ? "bg-primary scale-150"
                  : scrollProgress > overlays[i].startProgress
                  ? "bg-white/60"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Scroll hint */}
        {scrollProgress < 0.05 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-xs text-white/40 uppercase tracking-[0.3em]">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-5 h-9 rounded-full border border-white/20 flex items-start justify-center p-1.5"
            >
              <div className="w-1 h-1 rounded-full bg-primary" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ScrollVideoHero;
