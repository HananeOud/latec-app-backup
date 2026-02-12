"use client"

import React, { useState, useEffect, useRef } from 'react'
import { ContextContent } from '@/lib/types'
import { ContextHero } from './ContextHero'
import { ContextSection } from './ContextSection'
import { ContextBridge } from './ContextBridge'

export function ContextView() {
  const [content, setContent] = useState<ContextContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Load content from JSON
  useEffect(() => {
    fetch('/content/context.json')
      .then(res => res.json())
      .then(data => {
        setContent(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Failed to load context content:', err)
        setIsLoading(false)
      })
  }, [])

  // Scroll to first section
  const handleScrollDown = () => {
    if (scrollContainerRef.current) {
      const firstSection = scrollContainerRef.current.querySelector('#scale')
      if (firstSection) {
        firstSection.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--color-background-1)]">
        <div className="text-[var(--color-text-muted)] animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--color-background-1)]">
        <div className="text-[var(--color-text-muted)]">Failed to load content</div>
      </div>
    )
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="context-scroll-container h-full w-full overflow-y-auto overflow-x-hidden bg-[var(--color-background-1)]"
    >
      {/* Hero Section */}
      <ContextHero 
        title={content.hero.title}
        subtitle={content.hero.subtitle}
        onScrollDown={handleScrollDown}
      />

      {/* Content Sections */}
      {content.sections.map((section, index) => {
        const nextSection = content.sections[index + 1]
        const nextSectionId = nextSection?.id ?? 'cta-bridge'
        
        return (
          <ContextSection 
            key={section.id}
            section={section}
            index={index}
            nextSectionId={nextSectionId}
          />
        )
      })}

      {/* CTA Bridge */}
      <ContextBridge 
        title={content.cta.title}
        primaryButton={content.cta.primaryButton}
        secondaryLink={content.cta.secondaryLink}
      />
    </div>
  )
}
