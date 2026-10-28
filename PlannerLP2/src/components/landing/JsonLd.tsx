import { ESTIMATOR_PLANS, formatIdr } from "@/lib/pricing/plans";
import { BRANDS } from "@/lib/brand/brand.config";

/** Product + FAQ schema for SEO */
export function JsonLd() {
  const brand = BRANDS.estimator;
  const paid = ESTIMATOR_PLANS.filter((p) => p.priceIdr > 0);

  const product = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brand.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: paid.map((p) => ({
      "@type": "Offer",
      name: p.title,
      price: String(p.priceIdr),
      priceCurrency: "IDR",
      description: `${p.title} — ${formatIdr(p.priceIdr)} sekali bayar`,
    })),
    description:
      "Aplikasi estimasi harga proyek dan penawaran PDF untuk kontraktor, interior designer, kitchen set, dan furniture custom.",
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Cocok untuk bisnis jasa apa?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Kontraktor renovasi, interior designer, kitchen set, furniture custom, kanopi, railing, dan jasa proyek sejenis.",
        },
      },
      {
        "@type": "Question",
        name: "Hitungannya akurat?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Akurasi bergantung pada harga material & upah yang kamu input. Pro memungkinkan kustom pricelist sesuai area lokal.",
        },
      },
      {
        "@type": "Question",
        name: "Ada garansi uang kembali?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tidak ada garansi refund. Gunakan paket Gratis (3 estimasi) untuk mencoba alur hitung dan PDF sebelum membeli Standard atau Pro.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
    </>
  );
}
