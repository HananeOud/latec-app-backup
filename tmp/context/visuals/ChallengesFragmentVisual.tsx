"use client"

import React, { useEffect, useState, useMemo } from 'react'

interface ChallengesFragmentVisualProps {
  sources: string[]
  isVisible: boolean
}

// Foreground sources that should NOT be blurred (6 main ones)
const foregroundSources = ['ISEDIS', 'CIRIUM', 'SAP', 'ERP', 'APIs', 'Excel']

// Background fragment positions - many blurred fragments to fill space
const backgroundFragments = [
  // Scattered across the entire space
  { x: 5, y: 8 }, { x: 22, y: 5 }, { x: 38, y: 10 }, { x: 62, y: 7 }, { x: 78, y: 12 }, { x: 95, y: 6 },
  { x: 8, y: 25 }, { x: 28, y: 22 }, { x: 72, y: 28 }, { x: 92, y: 24 },
  { x: 3, y: 42 }, { x: 18, y: 38 }, { x: 35, y: 45 }, { x: 65, y: 42 }, { x: 82, y: 48 }, { x: 97, y: 40 },
  { x: 6, y: 58 }, { x: 25, y: 62 }, { x: 45, y: 55 }, { x: 55, y: 60 }, { x: 75, y: 58 }, { x: 94, y: 62 },
  { x: 4, y: 75 }, { x: 20, y: 78 }, { x: 40, y: 72 }, { x: 60, y: 76 }, { x: 80, y: 74 }, { x: 96, y: 78 },
  { x: 10, y: 92 }, { x: 30, y: 88 }, { x: 48, y: 95 }, { x: 68, y: 90 }, { x: 88, y: 94 },
  // Additional inner area fills
  { x: 32, y: 32 }, { x: 68, y: 35 }, { x: 35, y: 68 }, { x: 65, y: 65 },
  { x: 50, y: 25 }, { x: 50, y: 75 }, { x: 25, y: 50 }, { x: 75, y: 50 },
]

// Foreground fragment positions for the 6 main sources
const foregroundFragmentConfigs = [
  { x: 18, y: 28, size: 'lg' },   // ISEDIS
  { x: 82, y: 32, size: 'lg' },   // CIRIUM
  { x: 12, y: 58, size: 'lg' },   // SAP
  { x: 88, y: 62, size: 'lg' },   // ERP
  { x: 25, y: 78, size: 'lg' },   // APIs
  { x: 75, y: 75, size: 'lg' },   // Excel
]

// More broken connection attempts - crisscrossing the space to fill it
const brokenConnections = [
  // From corners toward center
  { from: { x: 12, y: 22 }, toward: { x: 55, y: 48 }, length: 0.32, delay: 0 },
  { from: { x: 88, y: 18 }, toward: { x: 45, y: 52 }, length: 0.35, delay: 0.5 },
  { from: { x: 8, y: 78 }, toward: { x: 52, y: 48 }, length: 0.30, delay: 1 },
  { from: { x: 90, y: 82 }, toward: { x: 48, y: 50 }, length: 0.33, delay: 1.5 },
  
  // Cross patterns
  { from: { x: 15, y: 45 }, toward: { x: 85, y: 55 }, length: 0.28, delay: 2 },
  { from: { x: 85, y: 45 }, toward: { x: 15, y: 55 }, length: 0.26, delay: 2.5 },
  { from: { x: 50, y: 10 }, toward: { x: 50, y: 90 }, length: 0.22, delay: 3 },
  { from: { x: 50, y: 90 }, toward: { x: 50, y: 10 }, length: 0.20, delay: 3.5 },
  
  // Diagonal fills
  { from: { x: 25, y: 15 }, toward: { x: 75, y: 85 }, length: 0.25, delay: 4 },
  { from: { x: 75, y: 15 }, toward: { x: 25, y: 85 }, length: 0.28, delay: 4.5 },
  { from: { x: 30, y: 60 }, toward: { x: 70, y: 40 }, length: 0.22, delay: 5 },
  { from: { x: 70, y: 60 }, toward: { x: 30, y: 40 }, length: 0.24, delay: 5.5 },
  
  // Additional fills for density
  { from: { x: 20, y: 30 }, toward: { x: 60, y: 70 }, length: 0.20, delay: 6 },
  { from: { x: 80, y: 30 }, toward: { x: 40, y: 70 }, length: 0.22, delay: 6.5 },
  { from: { x: 35, y: 25 }, toward: { x: 65, y: 75 }, length: 0.18, delay: 7 },
  { from: { x: 65, y: 25 }, toward: { x: 35, y: 75 }, length: 0.20, delay: 7.5 },
]

export function ChallengesFragmentVisual({ sources, isVisible }: ChallengesFragmentVisualProps) {
  const [isActive, setIsActive] = useState(false)
  
  // Separate foreground sources (ISEDIS, CIRIUM) from others
  const fgSources = sources.filter(s => foregroundSources.includes(s))
  const bgSourcePool = sources.filter(s => !foregroundSources.includes(s))
  
  // Generate many background fragments by cycling through the source pool
  const backgroundItems = useMemo(() => {
    return backgroundFragments.map((pos, idx) => ({
      ...pos,
      source: bgSourcePool[idx % bgSourcePool.length] || bgSourcePool[0] || 'Data',
      delay: idx * 0.08,
      driftIdx: idx % 9,
    }))
  }, [bgSourcePool])

  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(() => setIsActive(true), 200)
    return () => clearTimeout(timer)
  }, [isVisible])

  // Foreground props (sharp, prominent)
  const foregroundProps = {
    classes: 'w-24 h-11 text-[11px]',
    blur: '',
    opacity: 1,
    scale: 1,
    zIndex: 10,
    glowIntensity: 0.15
  }
  
  // Background props (blurred, subtle)
  const backgroundProps = {
    classes: 'w-14 h-6 text-[8px]',
    blur: 'blur-[2px]',
    opacity: 0.4,
    scale: 0.8,
    zIndex: 1,
    glowIntensity: 0.02
  }

  return (
    <div 
      className="relative w-full aspect-square max-w-lg mx-auto overflow-hidden"
      style={{
        // Edge fade mask - stronger fade into background
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 85%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 85%)',
      }}
    >
      {/* SVG Layer for broken connections - z-index 2 */}
      <svg 
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 2 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradient for fading broken lines - very subtle */}
          {brokenConnections.map((conn, idx) => {
            const dx = conn.toward.x - conn.from.x
            const dy = conn.toward.y - conn.from.y
            const angle = Math.atan2(dy, dx)
            const endX = conn.from.x + Math.cos(angle) * 50 * conn.length
            const endY = conn.from.y + Math.sin(angle) * 50 * conn.length
            
            return (
              <linearGradient
                key={`grad-${idx}`}
                id={`fadeGrad-${idx}`}
                x1={conn.from.x}
                y1={conn.from.y}
                x2={endX}
                y2={endY}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.25" />
                <stop offset="50%" stopColor="var(--color-accent-primary)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0" />
              </linearGradient>
            )
          })}
        </defs>

        {/* Broken connection lines - more of them, fainter */}
        {brokenConnections.map((conn, idx) => {
          const dx = conn.toward.x - conn.from.x
          const dy = conn.toward.y - conn.from.y
          const angle = Math.atan2(dy, dx)
          const endX = conn.from.x + Math.cos(angle) * 50 * conn.length
          const endY = conn.from.y + Math.sin(angle) * 50 * conn.length
          
          return (
            <line
              key={`broken-${idx}`}
              x1={conn.from.x}
              y1={conn.from.y}
              x2={endX}
              y2={endY}
              stroke={`url(#fadeGrad-${idx})`}
              strokeWidth="0.2"
              strokeDasharray="1,0.6"
              className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}
              style={{
                transitionDelay: `${conn.delay * 150}ms`,
                animation: isActive ? `lineSearch 12s ease-in-out infinite ${conn.delay * 0.5}s` : 'none',
              }}
            />
          )
        })}
      </svg>

      {/* Background fragments - many, blurred, subtle */}
      {backgroundItems.map((item, idx) => (
        <div
          key={`bg-${idx}`}
          className={`absolute flex items-center justify-center rounded-md border transition-all duration-1000 ${backgroundProps.classes} ${backgroundProps.blur} ${
            isActive ? '' : 'opacity-0 scale-75'
          }`}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: `translate(-50%, -50%) scale(${backgroundProps.scale})`,
            transitionDelay: `${item.delay * 150}ms`,
            borderColor: 'var(--color-accent-primary)',
            borderWidth: '1px',
            background: 'transparent',
            opacity: isActive ? backgroundProps.opacity : 0,
            zIndex: backgroundProps.zIndex,
            boxShadow: isActive ? `0 0 15px rgba(76, 128, 154, ${backgroundProps.glowIntensity})` : 'none',
            animation: isActive 
              ? `fragmentDrift${item.driftIdx} 30s ease-in-out infinite ${item.delay}s, fragmentRotate${item.driftIdx} 25s ease-in-out infinite ${item.delay}s`
              : 'none',
          }}
        >
          <span 
            className="font-medium tracking-wide whitespace-nowrap"
            style={{ color: 'var(--color-accent-primary)' }}
          >
            {item.source}
          </span>
        </div>
      ))}

      {/* Foreground fragments - ISEDIS and CIRIUM, sharp and prominent */}
      {fgSources.map((source, idx) => {
        const config = foregroundFragmentConfigs[idx] || foregroundFragmentConfigs[0]
        
        return (
          <div
            key={`fg-${source}`}
            className={`absolute flex items-center justify-center rounded-md border transition-all duration-1000 ${foregroundProps.classes} ${
              isActive ? '' : 'opacity-0 scale-90'
            }`}
            style={{
              left: `${config.x}%`,
              top: `${config.y}%`,
              transform: `translate(-50%, -50%) scale(${foregroundProps.scale})`,
              transitionDelay: `${(idx + 1) * 400}ms`,
              borderColor: 'var(--color-accent-primary)',
              borderWidth: '1px',
              background: 'transparent',
              opacity: isActive ? foregroundProps.opacity : 0,
              zIndex: foregroundProps.zIndex,
              boxShadow: isActive ? `0 0 25px rgba(76, 128, 154, ${foregroundProps.glowIntensity})` : 'none',
              animation: isActive 
                ? `fragmentDrift${idx} 28s ease-in-out infinite ${idx * 0.5}s, fragmentRotate${idx} 22s ease-in-out infinite ${idx * 0.5}s`
                : 'none',
            }}
          >
            <span 
              className="font-semibold tracking-wide whitespace-nowrap"
              style={{ color: 'var(--color-accent-primary)' }}
            >
              {source}
            </span>
          </div>
        )
      })}

      {/* Inline keyframes for animations */}
      <style jsx>{`
        @keyframes lineSearch {
          0%, 100% {
            opacity: 0.4;
            stroke-dashoffset: 0;
          }
          50% {
            opacity: 0.1;
            stroke-dashoffset: 3;
          }
        }
        
        @keyframes fragmentDrift0 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(3px, 5px); }
        }
        
        @keyframes fragmentDrift1 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(-2px, 4px); }
        }
        
        @keyframes fragmentDrift2 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(-4px, 3px); }
        }
        
        @keyframes fragmentDrift3 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(3px, -4px); }
        }
        
        @keyframes fragmentDrift4 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(-3px, 4px); }
        }
        
        @keyframes fragmentDrift5 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(4px, -3px); }
        }
        
        @keyframes fragmentDrift6 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(-2px, -3px); }
        }
        
        @keyframes fragmentDrift7 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(-3px, -4px); }
        }
        
        @keyframes fragmentDrift8 {
          0%, 100% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(0, 0); }
          50% { transform: translate(-50%, -50%) scale(var(--scale, 1)) translate(2px, 3px); }
        }
        
        @keyframes fragmentRotate0 {
          0%, 100% { rotate: -1deg; }
          50% { rotate: 1deg; }
        }
        
        @keyframes fragmentRotate1 {
          0%, 100% { rotate: 1deg; }
          50% { rotate: -1deg; }
        }
        
        @keyframes fragmentRotate2 {
          0%, 100% { rotate: 1deg; }
          50% { rotate: -1deg; }
        }
        
        @keyframes fragmentRotate3 {
          0%, 100% { rotate: -1deg; }
          50% { rotate: 1deg; }
        }
        
        @keyframes fragmentRotate4 {
          0%, 100% { rotate: 1deg; }
          50% { rotate: -1deg; }
        }
        
        @keyframes fragmentRotate5 {
          0%, 100% { rotate: -1deg; }
          50% { rotate: 1deg; }
        }
        
        @keyframes fragmentRotate6 {
          0%, 100% { rotate: 1deg; }
          50% { rotate: -1deg; }
        }
        
        @keyframes fragmentRotate7 {
          0%, 100% { rotate: 1deg; }
          50% { rotate: -1deg; }
        }
        
        @keyframes fragmentRotate8 {
          0%, 100% { rotate: -1deg; }
          50% { rotate: 1deg; }
        }
      `}</style>
    </div>
  )
}
