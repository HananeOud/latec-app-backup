
import React, { useState, useEffect } from "react";
import { SpatialNetworkBackground } from "@/components/background/SpatialNetworkBackground";
import { useThemeContext } from "@/contexts/ThemeContext";
import { ArrowRight } from "lucide-react";

export function AboutView() {
  const { colors, animatedBackground } = useThemeContext();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const [scrollY, setScrollY] = useState(0);

  // Scroll tracking for parallax and blur effects
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target) {
        setScrollY(target.scrollTop);
      }
    };

    const scrollContainer = document.querySelector(".about-scroll-container");
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" },
    );

    document
      .querySelectorAll("[data-section]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div className="relative w-full overflow-hidden bg-[var(--color-background)] -mt-[var(--header-height)]" style={{ height: 'calc(100% + var(--header-height))' }}>
      {/* Three.js Spatial Network Background */}
      <SpatialNetworkBackground
        particleCount={animatedBackground.particleCount}
        connectionDistance={animatedBackground.connectionDistance}
        primaryColor={colors.animatedBgColor}
        secondaryColor={colors.animatedBgColor}
        particleOpacity={animatedBackground.particleOpacity}
        lineOpacity={animatedBackground.lineOpacity}
        particleSize={animatedBackground.particleSize}
        lineWidth={animatedBackground.lineWidth}
        animationSpeed={animatedBackground.animationSpeed}
      />

      {/* Content */}
      <div className="relative h-full overflow-y-auto scroll-smooth about-scroll-container">
        {/* Sticky Video Background with Blur Effect */}
        <div className="sticky top-0 w-full h-screen overflow-hidden bg-black z-0">
          <video
            className="w-full h-full object-cover transition-all duration-300"
            style={{
              filter: `blur(${Math.min(scrollY / 10, 30)}px) brightness(0.9)`,
              transform: `scale(${1 + scrollY / 2000})`,
            }}
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/about_video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Hero text - Floats in from right, fades and moves on scroll */}
          <div
            className="absolute top-24 md:top-32 right-8 md:right-16 max-w-xl transition-all duration-300 ease-out animate-float-in-right"
            style={{
              opacity: Math.max(1 - scrollY / 120, 0),
              transform: `translateY(${scrollY / 1.5}px) scale(${Math.max(1 - scrollY / 400, 0.95)})`,
              visibility: scrollY > 150 ? "hidden" : "visible",
            }}
          >
            <div className="px-6 py-4 bg-[var(--color-background)] rounded-xl shadow-2xl" style={{ opacity: 0.85 }}>
              <h1 className="text-3xl md:text-5xl font-bold text-[var(--color-text-heading)] mb-3 leading-tight">
                Your Company: Powering What&apos;s Next
              </h1>
              <p className="text-base md:text-lg text-[var(--color-text-primary)] leading-relaxed">
                Innovation meets operational excellence.
                <br /><br />
                Your company description goes here. Describe your core business, what sets you apart, and the value you deliver to your customers.
                <br /><br />
                Update this section in <code>client/src/components/about/AboutView.tsx</code> with your own story, achievements, and brand messaging.
              </p>
            </div>
          </div>
        </div>

        {/* Rest of Content - Scrolls over the video with backdrop */}
        <div className="relative z-10">
          <div
            className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-24 bg-[var(--color-background)] rounded-t-3xl shadow-2xl transition-transform duration-200 ease-out"
            style={{
              transform: `translateY(${Math.max(-scrollY / 8, -60)}px)`,
              opacity: Math.min(0.85, scrollY / 100 * 0.85),
            }}
          >
            {/* Content Sections */}
            <div className="space-y-32">

              {/* Section 1: Aerostructures */}
              <div
                id="foundations"
                data-section
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 ${
                  isVisible("foundations") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="space-y-6">
                  <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                      Aerostructures
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                    Engineering the future of flight
                  </h2>
                  <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                    Describe your first core product or service area here. Highlight what makes your solutions unique and the value they provide to your customers.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Feature or capability 1</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Feature or capability 2</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Feature or capability 3</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/img1.png" alt="Product or service area 1" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Section 2: Interconnection Systems */}
              <div
                id="analytics"
                data-section
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 md:grid-flow-dense ${
                  isVisible("analytics") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="md:col-start-2 space-y-6">
                  <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                      Interconnection Systems
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                    Connecting every system on board
                  </h2>
                  <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                    Describe your second core product or service area here. Explain how it complements your first offering and the problems it solves for customers.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Feature or capability 1</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Feature or capability 2</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Feature or capability 3</span>
                    </li>
                  </ul>
                </div>
                <div className="md:col-start-1 md:row-start-1">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/img2.png" alt="Product or service area 2" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Section 3: Innovation & Technology */}
              <div
                id="innovation"
                data-section
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 ${
                  isVisible("innovation") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="space-y-6">
                  <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                      Innovation &amp; Technology
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                    Pioneering the industry of the future
                  </h2>
                  <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                    Describe your innovation and R&amp;D efforts here. Highlight the cutting-edge technology and forward-thinking approach that differentiates your company.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Innovation initiative 1</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Innovation initiative 2</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Innovation initiative 3</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Innovation initiative 4</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/img3.png" alt="Innovation and technology" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Section 4: Global Presence */}
              <div
                id="global-presence"
                data-section
                className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center transition-all duration-1000 md:grid-flow-dense ${
                  isVisible("global-presence") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
              >
                <div className="md:col-start-2 space-y-6">
                  <div className="inline-block px-3 py-1 bg-[var(--color-accent-primary)]/10 rounded-full">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                      Global Presence
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-heading)] leading-tight">
                    A worldwide industrial footprint
                  </h2>
                  <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                    Describe your global reach and operational footprint. Highlight your presence across regions, key partnerships, and the scale of your operations.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Headquarters location</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Regional offices and production sites</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Key partnerships and clients</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Team size and global reach</span>
                    </li>
                  </ul>
                </div>
                <div className="md:col-start-1 md:row-start-1">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/img4.png" alt="Global presence" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

            </div>

            {/* CTA Section */}
            <div className="mt-32 text-center">
              <div className="max-w-3xl mx-auto p-12 md:p-16 bg-[#0C1C3E] rounded-3xl shadow-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Explore Our AI-Powered Tools
                </h2>
                <p className="text-lg text-white/90 mb-8">
                  Discover the intelligent agents and AI-powered tools built for your operations.
                </p>
                <a
                  href="/tools"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0C1C3E] font-semibold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  Explore Tools
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Bottom Spacing */}
            <div className="h-16" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float-in-right {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-float-in-right {
          animation: float-in-right 2s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
        }
      `}</style>
    </div>
  );
}
