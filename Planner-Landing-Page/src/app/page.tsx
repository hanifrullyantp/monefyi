"use client";
import { useEffect } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ThreeStepSection } from "@/components/landing/ThreeStepSection";
import { TransitionSection } from "@/components/landing/TransitionSection";
import { RelatableSection } from "@/components/landing/RelatableSection";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";
import { TestimonialSection } from "@/components/landing/TestimonialSection";
import { CalculatorSection } from "@/components/landing/CalculatorSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { GuaranteeFaqSection } from "@/components/landing/GuaranteeFaqSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { ToastNotification } from "@/components/landing/ToastNotification";
import { FloatingCTA } from "@/components/landing/FloatingCTA";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { BackToTop } from "@/components/landing/BackToTop";
import { AdminBar } from "@/components/landing/AdminBar";
import { Editable } from "@/components/landing/Editable";
import { useUiStore } from "@/lib/store/uiStore";

export default function HomePage() {
  const { load, content } = useContentStore();
  const { isAdmin } = useUiStore();

  useEffect(() => {
    load();
  }, [load]);

  const { sectionVisibility: vis } = content;

  return (
    <div className={isAdmin ? "pt-12" : ""}>
      <AdminBar />
      <ScrollProgress />
      <Navbar />

      <main>
        {vis.hero !== false && (
          <Editable sectionId="Hero">
            <HeroSection />
          </Editable>
        )}
        {vis.threeStep !== false && (
          <Editable sectionId="3 Step">
            <ThreeStepSection />
          </Editable>
        )}
        {vis.transition !== false && (
          <Editable sectionId="Transisi">
            <TransitionSection />
          </Editable>
        )}
        {vis.relatable !== false && (
          <Editable sectionId="Relatable">
            <RelatableSection />
          </Editable>
        )}
        {vis.productShowcase !== false && (
          <Editable sectionId="Product Showcase">
            <ProductShowcaseSection />
          </Editable>
        )}
        {vis.testimonial !== false && (
          <Editable sectionId="Testimonial" adminPath="/admin/testimonial">
            <TestimonialSection />
          </Editable>
        )}
        {vis.calculator !== false && (
          <Editable sectionId="Kalkulator">
            <CalculatorSection />
          </Editable>
        )}
        {vis.pricing !== false && (
          <Editable sectionId="Pricing" adminPath="/admin/pricing">
            <PricingSection />
          </Editable>
        )}
        {vis.guaranteeFaq !== false && (
          <Editable sectionId="FAQ" adminPath="/admin/faq">
            <GuaranteeFaqSection />
          </Editable>
        )}
        {vis.finalCta !== false && (
          <Editable sectionId="Final CTA">
            <FinalCtaSection />
          </Editable>
        )}
      </main>

      {vis.footer !== false && (
        <Editable sectionId="Footer" adminPath="/admin/footer">
          <FooterSection />
        </Editable>
      )}

      {/* Global interactive elements */}
      <ToastNotification />
      <FloatingCTA />
      <BackToTop />
    </div>
  );
}
