import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Solution from "@/components/sections/Solution";
import ValueProps from "@/components/sections/ValueProps";
import GeekAnatomy from "@/components/sections/geek/Anatomy";
import GeekClassification from "@/components/sections/geek/Classification";
import GeekSpecSheet from "@/components/sections/geek/SpecSheet";
import GeekDifficulty from "@/components/sections/geek/Difficulty";
import GeekTicker from "@/components/sections/geek/Ticker";
import Calculator from "@/components/ui/Calculator";
import ScopeSection from "@/components/sections/ScopeSection";
import PartnerMatch from "@/components/sections/PartnerMatch";
import FinalCTA from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <Hero />

        {/* Problem Section */}
        <Problem />

        {/* Solution Section */}
        <Solution />

        {/* Value Props Section */}
        <ValueProps />

        {/* Geek Sections */}
        <GeekAnatomy />
        <GeekClassification />
        <GeekSpecSheet />
        <GeekDifficulty />

        {/* Interactive Calculator - Phase 2 */}
        <Calculator />

        {/* Scope Section - 견적 포함 범위 */}
        <ScopeSection />

        {/* Partner Matching Section */}
        <PartnerMatch />

        {/* Real-time Ticker */}
        <GeekTicker />

        {/* Final CTA */}
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
