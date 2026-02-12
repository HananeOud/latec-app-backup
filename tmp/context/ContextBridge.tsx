"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

interface ContextBridgeProps {
  title: string
  primaryButton: {
    label: string
    action: string
  }
  secondaryLink?: {
    label: string
    action: string
  }
}

export function ContextBridge({ title, primaryButton, secondaryLink }: ContextBridgeProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  // Intersection Observer for entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handlePrimaryClick = () => {
    router.push(`/?tab=${primaryButton.action}`)
  }

  const handleSecondaryClick = () => {
    if (secondaryLink) {
      router.push(`/?tab=${secondaryLink.action}`)
    }
  }

  return (
    <section
      ref={sectionRef}
      id="cta-bridge"
      className="context-section min-h-screen flex items-center justify-center px-6 py-24"
    >
      <div 
        className={`text-center max-w-3xl mx-auto transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        {/* Title */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-text-heading)] leading-tight mb-12">
          {title}
        </h2>

        {/* Primary CTA Button */}
        <div
          className={`transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '300ms' }}
        >
          <button
            onClick={handlePrimaryClick}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-[var(--color-accent-primary)] text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <span>{primaryButton.label}</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Glow effect behind button */}
        <div 
          className={`absolute inset-0 -z-10 blur-3xl opacity-20 bg-[var(--color-accent-primary)] rounded-full transition-opacity duration-1000 ${
            isVisible ? 'opacity-20' : 'opacity-0'
          }`}
          style={{ 
            width: '300px', 
            height: '100px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />

        {/* Secondary Link */}
        {secondaryLink && (
          <div 
            className={`mt-8 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '500ms' }}
          >
            <button
              onClick={handleSecondaryClick}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] text-sm font-medium transition-colors underline underline-offset-4 decoration-[var(--color-border)] hover:decoration-[var(--color-accent-primary)]"
            >
              {secondaryLink.label}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
