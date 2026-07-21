import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export default function LuxuryBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* LAYER 1: Soft gradient mesh background (Light Pearl & White) */}
      <div className="absolute inset-0 bg-[#FCFCFC] bg-gradient-to-tr from-[#FAFAFA] via-[#FFFFFF] to-[#F7F8FA]" />

      {/* LAYER 2: Huge blurred luxury gradient blobs slowly morphing and moving */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[15%] left-[10%] w-[35rem] h-[35rem] rounded-full bg-gradient-to-br from-blue-100/35 to-cyan-100/25 blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -100, 60, 0],
          y: [0, 80, -50, 0],
          scale: [1, 0.85, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[20%] right-[5%] w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-amber-100/30 to-yellow-50/20 blur-[130px]"
      />
      <motion.div
        animate={{
          x: [0, 50, -50, 0],
          y: [0, 100, -80, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[50%] left-[40%] w-[25rem] h-[25rem] rounded-full bg-gradient-to-r from-emerald-50/25 to-blue-50/20 blur-[110px]"
      />

      {/* LAYER 3: Floating elegant transparent circles */}
      <motion.div
        animate={{ y: [0, -25, 0], rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute top-[10%] right-[15%] w-64 h-64 rounded-full border border-blue-500/5 flex items-center justify-center"
      >
        <div className="w-48 h-48 rounded-full border border-dashed border-amber-500/5" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 30, 0], rotate: -360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[15%] left-[8%] w-80 h-80 rounded-full border border-cyan-500/5 flex items-center justify-center"
      >
        <div className="w-60 h-60 rounded-full border border-dashed border-blue-500/5" />
      </motion.div>

      {/* LAYER 4: Tiny animated light particles drifting up */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 0.1,
              x: `${10 + Math.random() * 80}%`,
              y: `${20 + Math.random() * 70}%`,
              scale: 0.5 + Math.random() * 0.8,
            }}
            animate={{
              y: ["0%", "-15%"],
              opacity: [0, 0.45, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 1.5,
            }}
            className="absolute w-2 h-2 rounded-full bg-amber-400/25 blur-[1px]"
          />
        ))}
      </div>

      {/* LAYER 5: Animated smooth fluid SVG Wave transitions */}
      <div className="absolute left-0 right-0 bottom-0 overflow-hidden h-36">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full h-full opacity-35"
        >
          <motion.path
            animate={{
              d: [
                "M0,64 C240,96 480,96 720,64 C960,32 1200,32 1440,64 L1440,120 L0,120 Z",
                "M0,48 C240,16 480,80 720,48 C960,16 1200,80 1440,48 L1440,120 L0,120 Z",
                "M0,64 C240,96 480,96 720,64 C960,32 1200,32 1440,64 L1440,120 L0,120 Z"
              ]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            fill="url(#wave-grad-1)"
          />
          <defs>
            <linearGradient id="wave-grad-1" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* LAYER 6 & LAYER 7: Subtle noise and elegant texture card overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* LAYER 8: Technical geometric grid pattern with ultra-subtle opacity */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(#C8922C 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* LAYER 9: Animated glowing architectural streaming lines and premium textured curves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Streaming lines */}
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[18%] left-0 w-80 h-[1.5px] bg-gradient-to-r from-transparent via-[#C8922C]/30 to-transparent"
        />
        <motion.div
          animate={{ x: ["100%", "-100%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[60%] left-0 w-96 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"
        />
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[82%] left-0 w-80 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"
        />

        {/* Textured vector dental/smile bezier curves */}
        <svg className="absolute top-[30%] left-[-10%] w-[120%] h-[300px] opacity-[0.04]" viewBox="0 0 1440 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <motion.path 
            d="M 0 150 Q 360 80 720 150 T 1440 150" 
            stroke="url(#smile-grad-1)" 
            strokeWidth="2.5" 
            strokeDasharray="8 8"
            animate={{ strokeDashoffset: [0, -40] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
          <motion.path 
            d="M 0 130 Q 360 220 720 130 T 1440 130" 
            stroke="url(#smile-grad-2)" 
            strokeWidth="1.5"
            animate={{ strokeDashoffset: [0, 40] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          <defs>
            <linearGradient id="smile-grad-1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C8922C" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#C8922C" />
            </linearGradient>
            <linearGradient id="smile-grad-2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#C8922C" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* LAYER 9.5: Elegant watermark branding logo placed in the background with animated gradient glowing shadows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top/Middle Background Logo */}
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[290px] h-[290px] sm:w-[500px] sm:h-[500px] opacity-[0.042] flex items-center justify-center">
          {/* Animated gradient color shadow */}
          <motion.div
            animate={{
              scale: [1, 1.12, 0.96, 1],
              rotate: [0, 180, 360],
              opacity: [0.2, 0.45, 0.32, 0.2],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-[110%] h-[110%] rounded-full bg-gradient-to-r from-[#C8922C] via-blue-400 to-amber-500 blur-[65px]"
          />
          <img 
            src="/src/assets/images/gold_tooth_logo_1784383827217.jpg" 
            alt="" 
            className="w-full h-full object-contain filter grayscale contrast-125 select-none mix-blend-darken blur-[1.5px]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Lower Background Logo */}
        <div className="absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[290px] h-[290px] sm:w-[500px] sm:h-[500px] opacity-[0.038] flex items-center justify-center">
          {/* Animated gradient color shadow */}
          <motion.div
            animate={{
              scale: [1.05, 0.95, 1.08, 1.05],
              rotate: [360, 180, 0],
              opacity: [0.18, 0.38, 0.28, 0.18],
            }}
            transition={{
              duration: 26,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-[110%] h-[110%] rounded-full bg-gradient-to-r from-blue-400 via-[#C8922C] to-emerald-400 blur-[70px]"
          />
          <img 
            src="/src/assets/images/gold_tooth_logo_1784383827217.jpg" 
            alt="" 
            className="w-full h-full object-contain filter grayscale contrast-125 select-none mix-blend-darken blur-[1.5px]"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* LAYER 10: Smooth soft radial follow-cursor lighting (light spotlight follow) */}
      {isMounted && (
        <div
          className="absolute inset-0 transition-opacity duration-500 opacity-60 hidden md:block"
          style={{
            background: `radial-gradient(400px at ${mousePos.x}px ${mousePos.y}px, rgba(200, 146, 44, 0.05), transparent 80%)`,
          }}
        />
      )}
    </div>
  );
}
