"use client"

import React, { useEffect, useState, useMemo } from 'react'

interface ScaleMapVisualProps {
  isVisible: boolean
}

// Primary nodes - major hubs spread across the canvas
const primaryNodes = [
  { id: 'hub1', x: 12, y: 25, label: 'Paris', delay: 0 },
  { id: 'hub2', x: 42, y: 18, label: 'Dubai', delay: 100 },
  { id: 'hub3', x: 72, y: 30, label: 'Singapore', delay: 200 },
  { id: 'hub4', x: 88, y: 62, label: 'Sydney', delay: 300 },
  { id: 'hub5', x: 22, y: 72, label: 'New York', delay: 400 },
  { id: 'hub6', x: 55, y: 55, label: 'Tokyo', delay: 500 },
]

// Secondary nodes - smaller points to fill space
const secondaryNodes = [
  { x: 5, y: 45, delay: 600 },
  { x: 32, y: 12, delay: 650 },
  { x: 62, y: 78, delay: 700 },
  { x: 95, y: 35, delay: 750 },
  { x: 18, y: 88, delay: 800 },
  { x: 78, y: 8, delay: 850 },
  { x: 38, y: 42, delay: 900 },
  { x: 82, y: 82, delay: 950 },
  { x: 8, y: 15, delay: 1000 },
  { x: 68, y: 45, delay: 1050 },
  { x: 48, y: 92, delay: 1100 },
  { x: 28, y: 52, delay: 1150 },
]

// Primary connections between major hubs
const primaryConnections = [
  { from: 'hub1', to: 'hub2' },
  { from: 'hub2', to: 'hub3' },
  { from: 'hub3', to: 'hub4' },
  { from: 'hub3', to: 'hub6' },
  { from: 'hub1', to: 'hub5' },
  { from: 'hub5', to: 'hub6' },
  { from: 'hub2', to: 'hub6' },
  { from: 'hub4', to: 'hub6' },
  { from: 'hub1', to: 'hub6' },
]

// Secondary connections - ambient fill
const secondaryConnections = [
  { fromPrimary: 'hub1', toSecondary: 0 },
  { fromPrimary: 'hub2', toSecondary: 1 },
  { fromPrimary: 'hub3', toSecondary: 5 },
  { fromPrimary: 'hub4', toSecondary: 7 },
  { fromPrimary: 'hub5', toSecondary: 4 },
  { fromPrimary: 'hub6', toSecondary: 6 },
  { fromPrimary: 'hub1', toSecondary: 8 },
  { fromPrimary: 'hub3', toSecondary: 9 },
]

// Floating particles for ambient movement
const particles = [
  { size: 1.5, x: 15, y: 35, duration: 18, delay: 0 },
  { size: 2, x: 75, y: 20, duration: 22, delay: 2 },
  { size: 1, x: 45, y: 65, duration: 16, delay: 1 },
  { size: 1.5, x: 85, y: 75, duration: 20, delay: 3 },
  { size: 2, x: 25, y: 85, duration: 24, delay: 1.5 },
  { size: 1, x: 60, y: 10, duration: 17, delay: 2.5 },
  { size: 1.5, x: 35, y: 30, duration: 21, delay: 0.5 },
  { size: 1, x: 90, y: 50, duration: 19, delay: 3.5 },
]

// Grid lines for background structure
const gridLines = [
  { y: 15, opacity: 0.025 },
  { y: 30, opacity: 0.035 },
  { y: 45, opacity: 0.04 },
  { y: 55, opacity: 0.04 },
  { y: 70, opacity: 0.035 },
  { y: 85, opacity: 0.025 },
]

export function ScaleMapVisual({ isVisible }: ScaleMapVisualProps) {
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    // Staggered animation phases
    const timers = [
      setTimeout(() => setAnimationPhase(1), 200),   // Grid
      setTimeout(() => setAnimationPhase(2), 500),   // Primary nodes
      setTimeout(() => setAnimationPhase(3), 1100),  // Secondary nodes
      setTimeout(() => setAnimationPhase(4), 1500),  // Primary connections
      setTimeout(() => setAnimationPhase(5), 2000),  // Secondary connections
      setTimeout(() => setAnimationPhase(6), 2500),  // Data flow starts
    ]

    return () => timers.forEach(t => clearTimeout(t))
  }, [isVisible])

  const getPrimaryNode = (id: string) => primaryNodes.find(n => n.id === id)

  return (
    <div 
      className="relative w-full aspect-[16/10] max-w-2xl mx-auto"
      style={{
        perspective: '1000px',
      }}
    >
      {/* 3D Container with breathing animation */}
      <div
        className={`w-full h-full transition-all duration-1000 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: isVisible ? 'rotateX(8deg)' : 'rotateX(15deg)',
          transformStyle: 'preserve-3d',
          animationName: animationPhase >= 1 ? 'networkBreath' : 'none',
          animationDuration: '8s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* SVG Definitions for gradients and filters */}
          <defs>
            {/* Glow filter */}
            <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stronger glow for primary nodes */}
            <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial gradient for node outer glow */}
            <radialGradient id="nodeGlow">
              <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.6" />
              <stop offset="50%" stopColor="var(--color-accent-primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0" />
            </radialGradient>

            {/* Line gradient */}
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="var(--color-accent-primary)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Layer 1: Background Grid */}
          <g className="grid-layer">
            {gridLines.map((line, idx) => (
              <line
                key={`grid-${idx}`}
                x1="0"
                y1={line.y}
                x2="100"
                y2={line.y}
                stroke="var(--color-accent-primary)"
                strokeWidth="0.15"
                opacity={animationPhase >= 1 ? line.opacity : 0}
                style={{
                  transition: `opacity 0.8s ease-out ${idx * 0.1}s`,
                }}
              />
            ))}
            {/* Vertical edge lines */}
            <line
              x1="5" y1="10" x2="5" y2="90"
              stroke="var(--color-accent-primary)"
              strokeWidth="0.1"
              opacity={animationPhase >= 1 ? 0.02 : 0}
              style={{ transition: 'opacity 0.8s ease-out 0.3s' }}
            />
            <line
              x1="95" y1="10" x2="95" y2="90"
              stroke="var(--color-accent-primary)"
              strokeWidth="0.1"
              opacity={animationPhase >= 1 ? 0.02 : 0}
              style={{ transition: 'opacity 0.8s ease-out 0.3s' }}
            />
          </g>

          {/* Layer 2: Secondary Connections (ambient) */}
          <g className="secondary-connections">
            {secondaryConnections.map((conn, idx) => {
              const primary = getPrimaryNode(conn.fromPrimary)
              const secondary = secondaryNodes[conn.toSecondary]
              if (!primary || !secondary) return null

              return (
                <line
                  key={`sec-conn-${idx}`}
                  x1={primary.x}
                  y1={primary.y}
                  x2={secondary.x}
                  y2={secondary.y}
                  stroke="var(--color-accent-primary)"
                  strokeWidth="0.2"
                  opacity={animationPhase >= 5 ? 0.1 : 0}
                  style={{
                    transition: `opacity 0.6s ease-out ${idx * 0.05}s`,
                  }}
                />
              )
            })}
          </g>

          {/* Layer 3: Primary Connections with data flow */}
          <g className="primary-connections">
            {primaryConnections.map((conn, idx) => {
              const from = getPrimaryNode(conn.from)
              const to = getPrimaryNode(conn.to)
              if (!from || !to) return null

              const length = Math.sqrt(
                Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
              )

              return (
                <g key={`conn-${idx}`}>
                  {/* Base line */}
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="var(--color-accent-primary)"
                    strokeWidth="0.4"
                    opacity={animationPhase >= 4 ? 0.3 : 0}
                    filter="url(#glow)"
                    style={{
                      transition: `opacity 0.6s ease-out ${idx * 0.08}s`,
                    }}
                  />
                  {/* Animated data flow line */}
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="var(--color-accent-primary)"
                    strokeWidth="0.3"
                    strokeDasharray="2,3"
                    opacity={animationPhase >= 6 ? 0.6 : 0}
                    style={{
                      animationName: animationPhase >= 6 ? 'dataFlow' : 'none',
                      animationDuration: `${1.5 + idx * 0.2}s`,
                      animationTimingFunction: 'linear',
                      animationIterationCount: 'infinite',
                      transition: `opacity 0.5s ease-out`,
                    }}
                  />
                </g>
              )
            })}
          </g>

          {/* Layer 4: Secondary Nodes */}
          <g className="secondary-nodes">
            {secondaryNodes.map((node, idx) => (
              <g key={`sec-node-${idx}`}>
                {/* Glow */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="1.5"
                  fill="url(#nodeGlow)"
                  opacity={animationPhase >= 3 ? 0.4 : 0}
                  style={{
                    transition: `opacity 0.4s ease-out ${(node.delay - 600) / 1000}s`,
                  }}
                />
                {/* Core */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="0.6"
                  fill="var(--color-accent-primary)"
                  opacity={animationPhase >= 3 ? 0.7 : 0}
                  style={{
                    transition: `opacity 0.4s ease-out ${(node.delay - 600) / 1000}s`,
                    animationName: animationPhase >= 3 ? 'nodeTwinkle' : 'none',
                    animationDuration: `${3 + idx * 0.3}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${idx * 0.2}s`,
                  }}
                />
              </g>
            ))}
          </g>

          {/* Layer 5: Primary Nodes */}
          <g className="primary-nodes">
            {primaryNodes.map((node, idx) => (
              <g 
                key={node.id}
                style={{
                  opacity: animationPhase >= 2 ? 1 : 0,
                  transition: `opacity 0.6s ease-out ${node.delay / 1000}s`,
                }}
              >
                {/* Outer glow */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="6"
                  fill="url(#nodeGlow)"
                  opacity={0.5}
                />

                {/* Pulse ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="4"
                  fill="none"
                  stroke="var(--color-accent-primary)"
                  strokeWidth="0.3"
                  opacity={0.4}
                  style={{
                    animationName: 'nodeRingPulse',
                    animationDuration: `${2.5 + idx * 0.2}s`,
                    animationTimingFunction: 'ease-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${idx * 0.3}s`,
                    transformOrigin: `${node.x}px ${node.y}px`,
                  }}
                />

                {/* Core circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="2"
                  fill="var(--color-accent-primary)"
                  filter="url(#strongGlow)"
                />

                {/* Inner bright spot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="0.8"
                  fill="white"
                  opacity={0.9}
                />

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 5}
                  textAnchor="middle"
                  fill="var(--color-accent-primary)"
                  fontSize="2.2"
                  fontWeight="500"
                  opacity={0.7}
                  style={{
                    fontFamily: 'var(--font-family-primary), system-ui, sans-serif',
                  }}
                >
                  {node.label}
                </text>
              </g>
            ))}
          </g>

          {/* Layer 6: Floating Particles */}
          <g className="particles">
            {particles.map((particle, idx) => (
              <circle
                key={`particle-${idx}`}
                cx={particle.x}
                cy={particle.y}
                r={particle.size * 0.3}
                fill="white"
                opacity={animationPhase >= 2 ? 0.3 : 0}
                style={{
                  animationName: animationPhase >= 2 ? 'particleFloat' : 'none',
                  animationDuration: `${particle.duration}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${particle.delay}s`,
                  transition: 'opacity 1s ease-out',
                }}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Corner accents */}
      <div 
        className="absolute top-0 left-0 w-8 h-8 border-l border-t border-[var(--color-accent-primary)] opacity-20"
        style={{
          opacity: animationPhase >= 1 ? 0.2 : 0,
          transition: 'opacity 0.8s ease-out 0.5s',
        }}
      />
      <div 
        className="absolute top-0 right-0 w-8 h-8 border-r border-t border-[var(--color-accent-primary)] opacity-20"
        style={{
          opacity: animationPhase >= 1 ? 0.2 : 0,
          transition: 'opacity 0.8s ease-out 0.6s',
        }}
      />
      <div 
        className="absolute bottom-0 left-0 w-8 h-8 border-l border-b border-[var(--color-accent-primary)] opacity-20"
        style={{
          opacity: animationPhase >= 1 ? 0.2 : 0,
          transition: 'opacity 0.8s ease-out 0.7s',
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-8 h-8 border-r border-b border-[var(--color-accent-primary)] opacity-20"
        style={{
          opacity: animationPhase >= 1 ? 0.2 : 0,
          transition: 'opacity 0.8s ease-out 0.8s',
        }}
      />
    </div>
  )
}
