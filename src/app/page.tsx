import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import EventBanner from "@/components/sections/EventBanner";
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
import EstimateShare from "@/components/sections/EstimateShare";
import PartnerMatch from "@/components/sections/PartnerMatch";
import PortfolioShowcase from "@/components/sections/PortfolioShowcase";
import FinalCTA from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <Hero />

        {/* 12월 이벤트 배너 */}
        <EventBanner />

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

        {/* 견적서 공유 할인 - 투명성 캠페인 */}
        <EstimateShare />

        {/* Partner Matching Section */}
        <PartnerMatch />

        {/* Portfolio Showcase - 시공 포트폴리오 */}
        <PortfolioShowcase />

        {/* Real-time Ticker */}
        <GeekTicker />

        {/* Final CTA */}
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
