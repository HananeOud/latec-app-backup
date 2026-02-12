"use client"

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface ScaleGlobeVisualProps {
  isVisible: boolean
}

// Global location nodes - airports/MRO sites distributed worldwide
const locationNodes = [
  // Europe
  { lat: 48.8566, lon: 2.3522, size: 0.8 },      // Paris
  { lat: 51.5074, lon: -0.1278, size: 0.7 },     // London
  { lat: 50.1109, lon: 8.6821, size: 0.6 },      // Frankfurt
  { lat: 41.9028, lon: 12.4964, size: 0.5 },     // Rome
  { lat: 40.4168, lon: -3.7038, size: 0.5 },     // Madrid
  
  // Middle East
  { lat: 25.2048, lon: 55.2708, size: 0.8 },     // Dubai
  { lat: 25.2854, lon: 51.5310, size: 0.6 },     // Doha
  { lat: 24.4539, lon: 54.3773, size: 0.5 },     // Abu Dhabi
  
  // Asia
  { lat: 1.3521, lon: 103.8198, size: 0.8 },     // Singapore
  { lat: 35.6762, lon: 139.6503, size: 0.8 },    // Tokyo
  { lat: 22.3193, lon: 114.1694, size: 0.7 },    // Hong Kong
  { lat: 37.5665, lon: 126.9780, size: 0.6 },    // Seoul
  { lat: 31.2304, lon: 121.4737, size: 0.6 },    // Shanghai
  { lat: 28.6139, lon: 77.2090, size: 0.5 },     // Delhi
  
  // Americas
  { lat: 40.7128, lon: -74.0060, size: 0.8 },    // New York
  { lat: 33.9425, lon: -118.4081, size: 0.7 },   // Los Angeles
  { lat: 25.7617, lon: -80.1918, size: 0.6 },    // Miami
  { lat: -23.5505, lon: -46.6333, size: 0.6 },   // São Paulo
  { lat: 19.4326, lon: -99.1332, size: 0.5 },    // Mexico City
  
  // Oceania
  { lat: -33.8688, lon: 151.2093, size: 0.7 },   // Sydney
  { lat: -36.8485, lon: 174.7633, size: 0.5 },   // Auckland
  
  // Africa
  { lat: -33.9249, lon: 18.4241, size: 0.5 },    // Cape Town
  { lat: 30.0444, lon: 31.2357, size: 0.5 },     // Cairo
]

// Flight arc connections between nodes
const flightConnections = [
  // Trans-Atlantic
  { from: 0, to: 14 },   // Paris - New York
  { from: 1, to: 14 },   // London - New York
  { from: 0, to: 15 },   // Paris - Los Angeles
  { from: 1, to: 16 },   // London - Miami
  
  // Europe - Middle East
  { from: 0, to: 5 },    // Paris - Dubai
  { from: 1, to: 5 },    // London - Dubai
  { from: 2, to: 6 },    // Frankfurt - Doha
  { from: 3, to: 7 },    // Rome - Abu Dhabi
  
  // Middle East - Asia
  { from: 5, to: 8 },    // Dubai - Singapore
  { from: 5, to: 9 },    // Dubai - Tokyo
  { from: 6, to: 10 },   // Doha - Hong Kong
  { from: 7, to: 11 },   // Abu Dhabi - Seoul
  
  // Trans-Pacific
  { from: 15, to: 9 },   // LA - Tokyo
  { from: 15, to: 8 },   // LA - Singapore
  { from: 14, to: 10 },  // NY - Hong Kong
  
  // Europe - Asia Direct
  { from: 0, to: 8 },    // Paris - Singapore
  { from: 1, to: 9 },    // London - Tokyo
  { from: 2, to: 12 },   // Frankfurt - Shanghai
  
  // Southern Routes
  { from: 5, to: 19 },   // Dubai - Sydney
  { from: 8, to: 19 },   // Singapore - Sydney
  { from: 17, to: 21 },  // São Paulo - Cape Town
  { from: 0, to: 22 },   // Paris - Cairo
  
  // Additional connections for density
  { from: 8, to: 10 },   // Singapore - Hong Kong
  { from: 9, to: 11 },   // Tokyo - Seoul
  { from: 14, to: 17 },  // NY - São Paulo
  { from: 16, to: 18 },  // Miami - Mexico City
  
  // Extra global routes
  { from: 1, to: 13 },   // London - Delhi
  { from: 2, to: 9 },    // Frankfurt - Tokyo
  { from: 5, to: 13 },   // Dubai - Delhi
  { from: 10, to: 9 },   // Hong Kong - Tokyo
  { from: 19, to: 8 },   // Sydney - Singapore
  { from: 4, to: 17 },   // Madrid - São Paulo
  { from: 0, to: 6 },    // Paris - Doha
]

// Convert lat/lon to 3D sphere coordinates
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  
  return new THREE.Vector3(x, y, z)
}

// Create a great-circle arc between two points on the sphere
function createArcCurve(
  start: THREE.Vector3, 
  end: THREE.Vector3, 
  radius: number, 
  altitude: number = 0.15
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = []
  const segments = 50
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    
    // Spherical interpolation
    const point = new THREE.Vector3()
    point.copy(start).lerp(end, t)
    point.normalize()
    
    // Add altitude curve (highest at middle)
    const altitudeFactor = Math.sin(t * Math.PI) * altitude
    point.multiplyScalar(radius * (1 + altitudeFactor))
    
    points.push(point)
  }
  
  return new THREE.CatmullRomCurve3(points)
}

// Create a horizon ring (great circle) at a specific rotation
function createHorizonRing(radius: number, segments: number = 128): THREE.BufferGeometry {
  const points: THREE.Vector3[] = []
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ))
  }
  
  return new THREE.BufferGeometry().setFromPoints(points)
}

export function ScaleGlobeVisual({ isVisible }: ScaleGlobeVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    globe: THREE.Group
    arcs: THREE.Group
    animationId: number | null
    startTime: number
  } | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !isVisible) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Get accent color from CSS variables
    const computedStyle = getComputedStyle(document.documentElement)
    const accentColor = computedStyle.getPropertyValue('--color-accent-primary').trim() || '#4c809a'
    const threeAccentColor = new THREE.Color(accentColor)

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 4.2
    camera.position.y = 0.4

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    const globeRadius = 1.2
    const globe = new THREE.Group()

    // === HORIZON RINGS (3 artistic great circles to suggest globe shape) ===
    const horizonRingMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: threeAccentColor },
        opacity: { value: 0.1 }
      },
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        void main() {
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    // Ring 1: Slight tilt (like equator but angled)
    const ring1Geometry = createHorizonRing(globeRadius)
    const ring1 = new THREE.Line(ring1Geometry, horizonRingMaterial.clone())
    ring1.rotation.x = Math.PI * 0.08
    ring1.rotation.z = Math.PI * 0.05
    globe.add(ring1)

    // Ring 2: Tilted 50 degrees (polar orbit feel)
    const ring2Geometry = createHorizonRing(globeRadius)
    const ring2 = new THREE.Line(ring2Geometry, horizonRingMaterial.clone())
    ring2.rotation.x = Math.PI * 0.28
    ring2.rotation.y = Math.PI * 0.15
    globe.add(ring2)

    // Ring 3: Tilted opposite direction
    const ring3Geometry = createHorizonRing(globeRadius)
    const ring3 = new THREE.Line(ring3Geometry, horizonRingMaterial.clone())
    ring3.rotation.x = -Math.PI * 0.22
    ring3.rotation.y = Math.PI * 0.4
    ring3.rotation.z = Math.PI * 0.1
    globe.add(ring3)

    // === LOCATION NODES (small, clean dots) ===
    const nodeGeometry = new THREE.BufferGeometry()
    const nodePositions: number[] = []
    const nodeSizes: number[] = []
    
    locationNodes.forEach(node => {
      const pos = latLonToVector3(node.lat, node.lon, globeRadius * 1.005)
      nodePositions.push(pos.x, pos.y, pos.z)
      nodeSizes.push(node.size)
    })
    
    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3))
    nodeGeometry.setAttribute('size', new THREE.Float32BufferAttribute(nodeSizes, 1))
    
    const nodeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: threeAccentColor },
        pixelRatio: { value: renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float size;
        uniform float pixelRatio;
        varying float vSize;
        void main() {
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (120.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying float vSize;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          // Clean, simple dot with soft edge
          float core = smoothstep(0.5, 0.2, dist);
          float glow = smoothstep(0.5, 0.0, dist) * 0.3;
          
          // Gentle pulse
          float pulse = sin(time * 1.2 + vSize * 4.0) * 0.1 + 0.9;
          
          float alpha = (core * 0.85 + glow) * pulse;
          
          if (alpha < 0.02) discard;
          
          // Slight brighten at center
          vec3 finalColor = color + vec3(0.1) * core;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial)
    globe.add(nodePoints)

    // === FLIGHT ARCS (the hero - prominent, beautiful motion) ===
    const arcs = new THREE.Group()
    
    flightConnections.forEach((conn, index) => {
      const startNode = locationNodes[conn.from]
      const endNode = locationNodes[conn.to]
      
      const startPos = latLonToVector3(startNode.lat, startNode.lon, globeRadius * 1.005)
      const endPos = latLonToVector3(endNode.lat, endNode.lon, globeRadius * 1.005)
      
      const curve = createArcCurve(startPos, endPos, globeRadius * 1.005, 0.1)
      const points = curve.getPoints(60)
      const arcGeometry = new THREE.BufferGeometry().setFromPoints(points)
      
      // Add progress attribute for animation
      const progressAttr = new Float32Array(points.length)
      for (let i = 0; i < points.length; i++) {
        progressAttr[i] = i / (points.length - 1)
      }
      arcGeometry.setAttribute('progress', new THREE.BufferAttribute(progressAttr, 1))
      
      const arcMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: threeAccentColor },
          drawProgress: { value: 0 },
          arcIndex: { value: index },
          totalArcs: { value: flightConnections.length }
        },
        vertexShader: `
          attribute float progress;
          varying float vProgress;
          void main() {
            vProgress = progress;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color;
          uniform float drawProgress;
          uniform float arcIndex;
          varying float vProgress;
          
          void main() {
            // Draw animation
            float drawEdge = smoothstep(drawProgress - 0.01, drawProgress, vProgress);
            if (drawEdge > 0.99) discard;
            
            // Base visibility - thin but clear
            float baseAlpha = 0.35;
            
            // Primary traveling light - long smooth trail
            float travelSpeed = 0.25;
            float travelPos = mod(time * travelSpeed + arcIndex * 0.08, 1.0);
            float travelWidth = 0.18;
            float travel = smoothstep(travelWidth, 0.0, abs(vProgress - travelPos));
            
            // Secondary traveling light - offset timing
            float travelPos2 = mod(time * travelSpeed * 0.65 + arcIndex * 0.12 + 0.5, 1.0);
            float travel2 = smoothstep(travelWidth * 0.7, 0.0, abs(vProgress - travelPos2)) * 0.6;
            
            // Edge fade
            float edgeFade = smoothstep(0.0, 0.05, vProgress) * smoothstep(1.0, 0.95, vProgress);
            
            // Combined alpha
            float alpha = (baseAlpha + travel * 0.5 + travel2 * 0.3) * edgeFade * (1.0 - drawEdge);
            
            // Brighten at travel points
            vec3 finalColor = color + vec3(0.25, 0.3, 0.35) * (travel + travel2 * 0.5);
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      
      const arcLine = new THREE.Line(arcGeometry, arcMaterial)
      arcs.add(arcLine)
    })
    
    globe.add(arcs)

    // === SUBTLE OUTER GLOW (just a hint of atmosphere) ===
    const glowGeometry = new THREE.SphereGeometry(globeRadius * 1.06, 32, 32)
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: threeAccentColor },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float time;
        varying vec3 vNormal;
        void main() {
          float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
          gl_FragColor = vec4(glowColor, rim * 0.04);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
    const outerGlow = new THREE.Mesh(glowGeometry, glowMaterial)
    scene.add(outerGlow)

    scene.add(globe)

    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      globe,
      arcs,
      animationId: null,
      startTime: performance.now()
    }

    setIsInitialized(true)

    // Animation loop
    let time = 0
    const animate = () => {
      if (!sceneRef.current) return

      time += 0.016 // ~60fps
      const elapsed = (performance.now() - sceneRef.current.startTime) / 1000

      const { camera, renderer, scene, globe, arcs } = sceneRef.current

      // Update uniforms
      ;(nodeMaterial as THREE.ShaderMaterial).uniforms.time.value = time
      ;(glowMaterial as THREE.ShaderMaterial).uniforms.time.value = time

      // Animate arc drawing (staggered entrance)
      arcs.children.forEach((arc, index) => {
        const material = (arc as THREE.Line).material as THREE.ShaderMaterial
        material.uniforms.time.value = time
        
        // Staggered draw animation
        const drawDelay = 0.5 + index * 0.06
        const drawDuration = 1.0
        const drawProgress = Math.min(1, Math.max(0, (elapsed - drawDelay) / drawDuration))
        material.uniforms.drawProgress.value = drawProgress
      })

      // Globe rotation - visible but gentle
      if (!prefersReducedMotion) {
        globe.rotation.y += 0.002
        
        // Very subtle tilt oscillation
        globe.rotation.x = Math.sin(time * 0.08) * 0.02
        
        // Subtle camera drift
        camera.position.x = Math.sin(time * 0.04) * 0.1
        camera.position.y = 0.4 + Math.cos(time * 0.03) * 0.06
        camera.lookAt(0, 0, 0)
      }

      renderer.render(scene, camera)
      sceneRef.current.animationId = requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      sceneRef.current.camera.aspect = width / height
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)

      if (sceneRef.current) {
        if (sceneRef.current.animationId !== null) {
          cancelAnimationFrame(sceneRef.current.animationId)
        }

        sceneRef.current.renderer.dispose()
        
        // Dispose geometries and materials
        globe.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })

        if (container.contains(sceneRef.current.renderer.domElement)) {
          container.removeChild(sceneRef.current.renderer.domElement)
        }
      }
    }
  }, [isVisible])

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-square transition-opacity duration-1000 ${
        isVisible && isInitialized ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        minHeight: '400px',
        maxHeight: '600px'
      }}
    />
  )
}
