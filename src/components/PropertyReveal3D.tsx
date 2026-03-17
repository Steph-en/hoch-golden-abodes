import { useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Float, Text } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useInView } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

// A stylized building that extrudes on scroll
const Building = ({ scrollProgress }: { scrollProgress: number }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const floorRefs = useRef<THREE.Mesh[]>([]);

  const floors = 5;
  const floorHeight = 0.6;
  const baseWidth = 2;
  const baseDepth = 1.5;

  useFrame(() => {
    if (!groupRef.current) return;
    // Gentle rotation based on scroll
    groupRef.current.rotation.y = scrollProgress * Math.PI * 0.5 - Math.PI * 0.25;
  });

  const floorMeshes = useMemo(() => {
    return Array.from({ length: floors }, (_, i) => {
      const progress = Math.max(0, Math.min(1, (scrollProgress - i * 0.15) * 3));
      const width = baseWidth - i * 0.1;
      const depth = baseDepth - i * 0.05;
      return { index: i, progress, width, depth };
    });
  }, [scrollProgress]);

  return (
    <group ref={groupRef} position={[0, -1.5, 0]}>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.4} />
      </mesh>

      {/* Building floors */}
      {floorMeshes.map(({ index, progress, width, depth }) => (
        <group key={index}>
          {/* Floor slab */}
          <mesh
            position={[0, index * floorHeight * progress, 0]}
            scale={[progress, progress, progress]}
          >
            <boxGeometry args={[width, floorHeight * 0.85, depth]} />
            <meshStandardMaterial
              color={index === 0 ? "#c89b3c" : "#2a2a2a"}
              metalness={0.3}
              roughness={0.7}
              transparent
              opacity={progress}
            />
          </mesh>

          {/* Windows */}
          {progress > 0.5 && index > 0 && (
            <>
              {[-0.5, 0, 0.5].map((x, wi) => (
                <mesh
                  key={`w-${index}-${wi}`}
                  position={[x * (width * 0.6), index * floorHeight * progress, depth / 2 + 0.01]}
                  scale={[progress, progress, 1]}
                >
                  <planeGeometry args={[0.25, floorHeight * 0.5]} />
                  <meshStandardMaterial
                    color="#c89b3c"
                    emissive="#c89b3c"
                    emissiveIntensity={0.3}
                    transparent
                    opacity={progress * 0.8}
                  />
                </mesh>
              ))}
            </>
          )}
        </group>
      ))}

      {/* Roof accent */}
      {scrollProgress > 0.7 && (
        <mesh position={[0, floors * floorHeight * Math.min(1, scrollProgress * 1.2), 0]}>
          <boxGeometry args={[baseWidth + 0.2, 0.1, baseDepth + 0.2]} />
          <meshStandardMaterial
            color="#c89b3c"
            metalness={0.6}
            roughness={0.3}
            transparent
            opacity={Math.max(0, (scrollProgress - 0.7) * 3)}
          />
        </mesh>
      )}
    </group>
  );
};

const Scene = ({ scrollProgress }: { scrollProgress: number }) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#c89b3c" />
      <pointLight position={[0, 3, 3]} intensity={0.5} color="#c89b3c" />
      <Building scrollProgress={scrollProgress} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 4}
      />
    </>
  );
};

const PropertyReveal3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionInView = useInView(containerRef as any, { once: false, margin: "-20%" });

  // Need useState import
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top 80%",
      end: "bottom 20%",
      scrub: 0.3,
      onUpdate: (self) => {
        setScrollProgress(self.progress);
      },
    });

    return () => st.kill();
  }, []);

  const steps = [
    { threshold: 0, label: "Foundation", desc: "The blueprint takes shape" },
    { threshold: 0.3, label: "Structure", desc: "Floors rise from the ground" },
    { threshold: 0.6, label: "Details", desc: "Windows illuminate the vision" },
    { threshold: 0.85, label: "Complete", desc: "Your luxury property awaits" },
  ];

  const activeStep = steps.reduce((acc, step, i) =>
    scrollProgress >= step.threshold ? i : acc, 0
  );

  return (
    <section ref={containerRef} className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 dark-gradient" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-primary font-medium">Interactive Experience</span>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mt-4 mb-4">
            Watch It <span className="text-gradient">Come to Life</span>
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Scroll to reveal the building — floor by floor, detail by detail
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* 3D Canvas */}
          <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden border border-white/10">
            {mounted && (
              <Canvas
                camera={{ position: [4, 3, 4], fov: 45 }}
                style={{ background: "transparent" }}
              >
                <Suspense fallback={null}>
                  <Scene scrollProgress={scrollProgress} />
                </Suspense>
              </Canvas>
            )}
            {/* Glow effect */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/5" />
          </div>

          {/* Steps indicator */}
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: i <= activeStep ? 1 : 0.3,
                  x: i <= activeStep ? 0 : 20,
                }}
                transition={{ duration: 0.5 }}
                className="flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  i <= activeStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 text-white/30"
                }`}>
                  <span className="text-sm font-bold">{i + 1}</span>
                </div>
                <div>
                  <h3 className={`text-xl font-display font-semibold transition-colors duration-500 ${
                    i <= activeStep ? "text-white" : "text-white/30"
                  }`}>
                    {step.label}
                  </h3>
                  <p className={`text-sm mt-1 transition-colors duration-500 ${
                    i <= activeStep ? "text-white/60" : "text-white/20"
                  }`}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Progress bar */}
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${scrollProgress * 100}%`,
                  background: "var(--gradient-gold)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Fix: need useState import at top
import { useState } from "react";

export default PropertyReveal3D;
