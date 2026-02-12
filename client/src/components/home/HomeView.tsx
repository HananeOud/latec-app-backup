import React, { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAgentsContext } from "@/contexts/AgentsContext";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { HomeContent } from "@/lib/types";
import { HomeHero } from "./HomeHero";
import { HomeSection } from "./HomeSection";
import { HomeBridge } from "./HomeBridge";

export function HomeView() {
  const [content, setContent] = useState<HomeContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    agentErrors,
    loading: agentsLoading,
    error: globalError,
  } = useAgentsContext();

  // Load content from JSON
  useEffect(() => {
    fetch("/content/home-content.json")
      .then((res) => res.json())
      .then((data) => {
        setContent(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load home content:", err);
        setIsLoading(false);
      });
  }, []);

  // Scroll to first section
  const handleScrollDown = () => {
    if (scrollContainerRef.current && content?.sections?.[0]) {
      const firstSection = scrollContainerRef.current.querySelector(
        `#${content.sections[0].id}`,
      );
      if (firstSection) {
        firstSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-[var(--color-text-muted)] animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">
          Failed to load content
        </div>
      </div>
    );
  }

  // Determine if there are agent errors to show
  const hasErrors =
    (!agentsLoading && globalError) ||
    (!agentsLoading && agentErrors.length > 0);

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden"
      >
        {/* Hero Section */}
        <HomeHero
          title={content.hero.title}
          subtitle={content.hero.subtitle}
          onScrollDown={handleScrollDown}
        />

        {/* Content Sections */}
        {content.sections.map((section, index) => {
          const nextSection = content.sections[index + 1];
          const nextSectionId = nextSection?.id ?? "cta-bridge";

          return (
            <HomeSection
              key={section.id}
              section={section}
              index={index}
              nextSectionId={nextSectionId}
            />
          );
        })}

        {/* CTA Bridge */}
        <HomeBridge
          title={content.cta.title}
          primaryButton={content.cta.primaryButton}
          secondaryLink={content.cta.secondaryLink}
        />
      </div>

      {/* Floating agent error banner */}
      {hasErrors && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
          <div className="p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-2">
              {agentsLoading ? (
                <Loader2 className="h-4 w-4 text-[var(--color-accent-primary)] animate-spin flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-[var(--color-error)] flex-shrink-0" />
              )}
              <p className="text-xs text-[var(--color-error)] truncate">
                {globalError
                  ? globalError.message
                  : `${agentErrors.length} agent${agentErrors.length > 1 ? "s" : ""} failed to load — check config/app.json`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      <ChatWidget />
    </>
  );
}
