import { Inter, Poppins } from "next/font/google";
import { loadFroyekPublished } from "@/lib/froyek/loadContent";
import { FroyekExperience } from "./FroyekExperience";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-froyek-sans",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-froyek-display",
});

export async function FroyekHome() {
  const content = await loadFroyekPublished();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: content.branding.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: content.pricing.plans.filter((plan) => !plan.contactOnly).map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: plan.id === "estimator_standard" ? "93000" : "199000",
          priceCurrency: "IDR",
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faq.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "Organization",
        name: content.branding.name,
        email: content.branding.contactEmail.includes("@") ? content.branding.contactEmail : undefined,
      },
    ],
  };

  return (
    <div className={`froyek-site ${inter.variable} ${poppins.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FroyekExperience initial={content} />
    </div>
  );
}
