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
import { MobileAdminToolbar } from "@/components/landing/MobileAdminToolbar";
import { EditModeRedirect } from "@/components/landing/EditModeRedirect";
import EstimatorPwaLaunchRedirect from "@/components/brand/EstimatorPwaLaunchRedirect";
import { BrandHead } from "@/components/brand/BrandHead";
import { TrackingScripts } from "@/components/landing/TrackingScripts";
import { JsonLd } from "@/components/landing/JsonLd";

export default function LandingPage() {
  return (
    <div className="lp-shell">
      <div className="lp-canvas">
        <EstimatorPwaLaunchRedirect />
        <BrandHead pageTitle="Kirim Penawaran Sebelum Kamu Pulang Survei" />
        <TrackingScripts />
        <JsonLd />
        <AuthHydrator />
        <ContentHydrator />
        <LoginRedirect />
        <EditModeRedirect />
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
        <MobileAdminToolbar />
      </div>
    </div>
  );
}
