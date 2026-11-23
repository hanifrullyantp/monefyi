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
import { headers } from "next/headers";
import { isFroyekMarketingHost } from "@/lib/config/publicHosts";
import { FroyekHome } from "@/components/froyek/FroyekHome";

export default async function LandingPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  if (isFroyekMarketingHost(host)) {
    return <FroyekHome />;
  }

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
