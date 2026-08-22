import { Navbar } from "@/components/landing/Navbar";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { ContentHydrator } from "@/components/landing/ContentHydrator";
import { LoginRedirect } from "@/components/landing/LoginRedirect";
import { HeroSection } from "@/components/landing/HeroSection";
import { ThreeStepSection } from "@/components/landing/ThreeStepSection";
import { TransitionSection } from "@/components/landing/TransitionSection";
import { RelatableSection } from "@/components/landing/RelatableSection";
import { CalculatorSection } from "@/components/landing/CalculatorSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TransformationSection } from "@/components/landing/TransformationSection";
import { TestimonialSection } from "@/components/landing/TestimonialSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { FreeToolsSection } from "@/components/landing/FreeToolsSection";
import { UrgencySection } from "@/components/landing/UrgencySection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { GuaranteeSection } from "@/components/landing/GuaranteeSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { FooterSection } from "@/components/landing/FooterSection";
import { ToastNotification } from "@/components/landing/ToastNotification";
import { FloatingCTA } from "@/components/landing/FloatingCTA";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { BackToTop } from "@/components/landing/BackToTop";
import { LiveChatWidget } from "@/components/landing/LiveChatWidget";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";

export default function LandingPage() {
  return (
    <>
      <AuthHydrator />
      <ContentHydrator />
      <LoginRedirect />
      <ScrollProgress />
      <Navbar />
      <main>
        <HeroSection />
        <ThreeStepSection />
        <TransitionSection />
        <RelatableSection />
        <CalculatorSection />
        <FeaturesSection />
        <TransformationSection />
        <TestimonialSection />
        <ComparisonSection />
        <FreeToolsSection />
        <UrgencySection />
        <PricingSection />
        <TrustBadges />
        <GuaranteeSection />
        <FAQSection />
        <FinalCTASection />
        <FooterSection />
      </main>
      <ToastNotification />
      <FloatingCTA />
      <BackToTop />
      <WhatsAppFloat />
      <LiveChatWidget />
    </>
  );
}
