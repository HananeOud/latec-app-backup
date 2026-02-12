
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
                Intraqual by Latecoere
              </h1>
              <p className="text-base md:text-lg text-[var(--color-text-primary)] leading-relaxed">
                <br /><br />
                Changing the way we interact with our knowledge base at Latecoere
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
                    Latecoere designs and manufactures critical aerostructure components for the world&apos;s leading aircraft manufacturers. From doors to fuselage sections, our solutions combine lightweight performance with the highest safety standards.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Aircraft doors for commercial and military platforms</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Fuselage sections and structural assemblies</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>eVTOL doors for next-generation air mobility</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/latecoere_aerostructures.jpg" alt="Latecoere Aerostructures - eVTOL doors and aircraft structures" className="w-full h-full object-cover" />
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
                    Latecoere provides the critical wiring, avionics, and electronic systems that connect aircraft from nose to tail. Our interconnection solutions ensure reliable communication, power distribution, and data flow across all on-board systems.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>EWIS &amp; Space harnesses for wiring architecture</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Avionics racks and equipment integration</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>On-board video surveillance and camera systems</span>
                    </li>
                  </ul>
                </div>
                <div className="md:col-start-1 md:row-start-1">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/latecoere_satellite.png" alt="Latecoere Interconnection Systems - Satellite harnesses and avionics" className="w-full h-full object-cover" />
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
                    Latecoere continuously invests in research and cutting-edge technology to anticipate the needs of tomorrow&apos;s aerospace industry. From supersonic flight to electric vertical takeoff, we are at the forefront of aviation&apos;s next chapter.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>AR-powered quality inspections for manufacturing</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>eVTOL door systems for urban air mobility</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>EWIS architecture for supersonic aircraft (Boom Overture)</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Satellite platform collaboration with Airbus Defence &amp; Space</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/latecoere_innovation.jpg" alt="Latecoere Innovation - Boom Overture supersonic aircraft" className="w-full h-full object-cover" />
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
                    With subsidiaries and production sites across the globe, Latecoere operates close to its customers on every continent. Our international network ensures agility, quality, and on-time delivery for the world&apos;s most demanding aerospace programs.
                  </p>
                  <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Headquarters in Toulouse, France &mdash; the heart of European aerospace</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Production sites in Europe, North America, and North Africa</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Tier 1 partner to Airbus, Boeing, Bombardier, Embraer, and Dassault</span>
                    </li>
                    <li className="flex items-start gap-3 text-[var(--color-text-primary)]">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] mt-2" />
                      <span>Over 5,000 employees across 13 countries</span>
                    </li>
                  </ul>
                </div>
                <div className="md:col-start-1 md:row-start-1">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
                    <img src="/images/latecoere_global.jpg" alt="Latecoere Global Presence - Subsidiaries around the world" className="w-full h-full object-cover" />
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
                  Discover the intelligent agents and agentic tools built for Latecoere operations.
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
