import { Navbar } from "@/components/landing/Navbar";
import { AuthHydrator } from "@/components/landing/AuthHydrator";
import { ContentHydrator } from "@/components/landing/ContentHydrator";
import { LoginRedirect } from "@/components/landing/LoginRedirect";
import { LandingPageSections } from "@/components/landing/LandingPageSections";
import { DeferredLandingWidgets } from "@/components/landing/DeferredLandingWidgets";
import { EditModeRedirect } from "@/components/landing/EditModeRedirect";
import EstimatorPwaLaunchRedirect from "@/components/brand/EstimatorPwaLaunchRedirect";
import { BrandHead } from "@/components/brand/BrandHead";
import { TrackingScripts } from "@/components/landing/TrackingScripts";
import { MetaPixelNoscript } from "@/components/landing/MetaPixelNoscript";
import { JsonLd } from "@/components/landing/JsonLd";
import { PublicLandingRoot } from "@/components/landing/PublicLandingRoot";

export default function LandingPage() {
  return (
    <PublicLandingRoot>
      <EstimatorPwaLaunchRedirect />
      <BrandHead pageTitle="Kirim Penawaran Sebelum Kamu Pulang Survei" />
      <TrackingScripts />
      <MetaPixelNoscript />
      <JsonLd />
      <AuthHydrator />
      <ContentHydrator />
      <LoginRedirect />
      <EditModeRedirect />
      <Navbar />
      <main>
        <LandingPageSections />
      </main>
      <DeferredLandingWidgets />
    </PublicLandingRoot>
  );
}
