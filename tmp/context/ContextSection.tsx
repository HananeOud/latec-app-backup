"use client"

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ContextSectionData } from '@/lib/types'
import { AnimatedCounter } from './AnimatedCounter'
import { ScaleGlobeVisual } from './visuals/ScaleGlobeVisual'
import { StakesWaterfallVisual } from './visuals/StakesWaterfallVisual'
import { ChallengesFragmentVisual } from './visuals/ChallengesFragmentVisual'

interface ContextSectionProps {
  section: ContextSectionData
  index: number
  nextSectionId?: string
}

export function ContextSection({ section, index, nextSectionId }: ContextSectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  // Scroll to next section handler
  const handleScrollToNext = () => {
    if (nextSectionId) {
      document.getElementById(nextSectionId)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Intersection Observer for entrance animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.2, rootMargin: '-50px' }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Determine animation direction based on layout
  const slideDirection = section.layout === 'left' ? 'slideInLeft' : 'slideInRight'
  const visualSlideDirection = section.layout === 'left' ? 'slideInRight' : 'slideInLeft'

  // Render the appropriate visual component
  const renderVisual = () => {
    switch (section.visual.type) {
      case 'map':
        return <ScaleGlobeVisual isVisible={isVisible} />
      case 'waterfall':
        return <StakesWaterfallVisual isVisible={isVisible} />
      case 'fragmentation':
        return <ChallengesFragmentVisual sources={section.visual.sources || []} isVisible={isVisible} />
      default:
        return null
    }
  }

  // Content component
  const contentElement = (
    <div 
      className={`space-y-6 transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${section.layout === 'left' ? '-translate-x-16' : 'translate-x-16'}`
      }`}
      style={{ transitionDelay: '200ms' }}
    >
      {/* Section badge */}
      <div className="inline-block">
        <span className="text-xs font-semibold text-[var(--color-accent-primary)] uppercase tracking-widest">
          {section.subtitle}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-heading)] tracking-tight">
        {section.title}
      </h2>

      {/* Statements */}
      {section.statements && section.statements.length > 0 && (
        <div className="space-y-3 pt-2">
          {section.statements.map((statement, idx) => (
            <p 
              key={idx}
              className={`text-lg md:text-xl text-[var(--color-text-primary)] leading-relaxed transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              } ${statement === 'Until now.' ? 'font-semibold text-[var(--color-accent-primary)] pt-2' : ''}`}
              style={{ transitionDelay: `${400 + idx * 150}ms` }}
            >
              {statement}
            </p>
          ))}
        </div>
      )}

      {/* Metrics */}
      {section.metrics && section.metrics.length > 0 && (
        <div className={`pt-6 ${section.metrics.length === 1 || section.id === 'scale' ? 'space-y-8' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
          {section.metrics.map((metric, idx) => (
            <div 
              key={idx}
              className={`transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${600 + idx * 150}ms` }}
            >
              <div className="text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--color-accent-primary)] tracking-tight">
                {metric.value !== null ? (
                  <AnimatedCounter
                    value={metric.value}
                    prefix={metric.prefix}
                    suffix={metric.suffix}
                    format={metric.format}
                    decimals={metric.decimals ?? (metric.value < 100 ? 1 : 0)}
                  />
                ) : (
                  <span>{metric.prefix}{metric.suffix}</span>
                )}
              </div>
              <p className="mt-2 text-sm md:text-base text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Visual component - Scale section gets special treatment for cinematic globe
  const isGlobeVisual = section.visual.type === 'map'
  const visualElement = (
    <div 
      className={`transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${section.layout === 'left' ? 'translate-x-16' : '-translate-x-16'}`
      } ${isGlobeVisual ? 'flex items-center justify-center min-h-[450px] lg:min-h-[550px]' : ''}`}
      style={{ transitionDelay: '400ms' }}
    >
      {renderVisual()}
    </div>
  )

  return (
    <section
      ref={sectionRef}
      id={section.id}
      className="context-section relative min-h-screen flex flex-col px-6 md:px-12 lg:px-16"
    >
      {/* Main content area - centered vertically */}
      <div className="flex-1 flex items-center py-16 md:py-24">
        <div className="max-w-7xl mx-auto w-full">
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
            section.layout === 'right' ? 'lg:grid-flow-dense' : ''
          }`}>
            {section.layout === 'left' ? (
              <>
                <div className="lg:pr-8">{contentElement}</div>
                <div className="lg:pl-8">{visualElement}</div>
              </>
            ) : (
              <>
                <div className="lg:col-start-2 lg:pl-8">{contentElement}</div>
                <div className="lg:col-start-1 lg:row-start-1 lg:pr-8">{visualElement}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scroll to next section arrow - fixed at bottom of section */}
      {nextSectionId && (
        <div className="pb-20 flex justify-center">
          <button
            onClick={handleScrollToNext}
            className={`text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] cursor-pointer group transition-opacity duration-500 ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Scroll to next section"
          >
            <ChevronDown 
              className="h-5 w-5 group-hover:translate-y-1 transition-transform" 
              style={{ animation: 'scrollBounce 2s ease-in-out infinite' }}
            />
          </button>
        </div>
      )}
    </section>
  )
}
