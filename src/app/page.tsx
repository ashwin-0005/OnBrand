import Link from "next/link";
import { HeroScene } from "@/components/landing/HeroScene";
import { heroDrafts } from "@/mocks/drafts";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { CitationGateScene } from "@/components/landing/CitationGateScene";
import { BeforeAfterDemo } from "@/components/landing/BeforeAfterDemo";
import { ProblemSection, RoleCards, ResponsibleCards, BenefitTiles } from "@/components/landing/Sections";
import { MetalBackground } from "@/components/landing/MetalBackground";
import { ScrollFX, MetalMarquee } from "@/components/landing/ScrollFX";

export default function Home() {
  return (
    <div className="relative isolate bg-navy-900 text-white">
      <MetalBackground />
      <SmoothScroll />
      <ScrollFX />
      <div className="relative z-10">
        <section aria-labelledby="hero-title" className="relative overflow-hidden">
          <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 pb-12 pt-28 sm:px-6 lg:grid-cols-2 lg:pb-0">
            <div data-hero-copy className="relative z-10">
              <p className="text-gold mb-5 text-sm font-semibold uppercase tracking-[0.3em]">
                Brand safety, before publish
              </p>
              <h1
                id="hero-title"
                data-sheen
                className="text-chrome font-serif text-5xl font-bold leading-[1.05] sm:text-6xl xl:text-7xl"
              >
                Catch brand risk before content goes live.
              </h1>
              <p className="mt-6 text-xl text-white/85">Explain every finding. Keep humans in control.</p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/review"
                  className="btn-gold inline-flex min-h-[48px] items-center rounded-full px-7 font-semibold transition-transform hover:-translate-y-0.5"
                >
                  Try a review
                </Link>
                <a
                  href="#how"
                  className="inline-flex min-h-[48px] items-center rounded-full px-7 font-semibold ring-1 ring-white/40 backdrop-blur-sm hover:bg-white/10"
                >
                  See how it works
                </a>
              </div>
              {/* The 3D scene is decorative; its idea exists here as real text. */}
              <div className="sr-only">
                <p>Examples of risky drafts OnBrand flags before they go live:</p>
                <ul>
                  {heroDrafts.map((d) => (
                    <li key={d.text}>
                      {d.text} ({d.tag})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="relative h-[380px] sm:h-[460px] lg:h-[640px]">
              <HeroScene />
            </div>
          </div>
        </section>
        <MetalMarquee words={["Outdated facts", "Unsupported claims", "Voice drift", "Off-brand visuals"]} />
        <ProblemSection />
        <ScrollStory />
        <MetalMarquee words={["Deterministic first", "AI second", "Every finding cited"]} direction="right" />
        <CitationGateScene />
        <BeforeAfterDemo />
        <RoleCards />
        <MetalMarquee words={["Suggestions only", "Humans decide", "Fully audited"]} />
        <ResponsibleCards />
        <BenefitTiles />
      </div>
    </div>
  );
}
