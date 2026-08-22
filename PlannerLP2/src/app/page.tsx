import { Navbar } from "@/components/landing/Navbar";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { ContentHydrator } from "@/components/landing/ContentHydrator";
import { LoginRedirect } from "@/components/landing/LoginRedirect";
import { LandingPageSections } from "@/components/landing/LandingPageSections";
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
        <LandingPageSections />
      </main>
      <ToastNotification />
      <FloatingCTA />
      <BackToTop />
      <WhatsAppFloat />
      <LiveChatWidget />
    </>
  );
}
