import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { BRANDS } from "@/lib/brand/brand.config";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
  variable: "--font-jakarta",
});

const brand = BRANDS.estimator;

export const metadata: Metadata = {
  title: {
    default: "Kirim Penawaran Sebelum Kamu Pulang Survei - Estimator",
    template: "%s - Estimator",
  },
  description:
    "Saring calon klien lewat WA, hitung harga langsung di HP, kirim PDF penawaran berlogo kamu sebelum klien pindah ke vendor lain. Untuk kontraktor, interior, kitchen set & furniture custom.",
  keywords:
    "aplikasi estimasi harga proyek, penawaran PDF kontraktor, aplikasi kitchen set, estimasi interior designer, RAB di HP",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Estimator",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: brand.assets.faviconSvg, type: "image/svg+xml" },
      { url: brand.assets.favicon32, sizes: "32x32", type: "image/png" },
      { url: brand.assets.icon192, sizes: "192x192", type: "image/png" },
    ],
    apple: brand.assets.appleTouchIcon,
  },
  openGraph: {
    title: "Kirim Penawaran Sebelum Kamu Pulang Survei - Estimator",
    description:
      "Hitung harga di lokasi, kirim PDF penawaran profesional sebelum pulang survei.",
    type: "website",
    images: [{ url: brand.assets.ogImage, width: 1200, height: 630, alt: "Estimator" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Estimator — Penawaran PDF untuk jasa proyek",
    description: "Dari ukur di lokasi ke PDF penawaran dalam hitungan menit.",
    images: [brand.assets.ogImage],
  },
};

export const viewport: Viewport = {
  themeColor: brand.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={plusJakartaSans.variable} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Estimator" />
        {/* Meta Pixel Resmi: Aktif instan saat load & terverifikasi oleh Meta Pixel Helper */}
        <script
          id="meta-pixel-base"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1530674178146899');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1530674178146899&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                window.__pwaPrompts = window.__pwaPrompts || {};
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  var path = window.location.pathname || '';
                  var key = path.startsWith('/admin') ? 'admin' : 'estimator';
                  window.__pwaPrompts[key] = e;
                  window.__pwaLastPrompt = e;
                  window.dispatchEvent(new CustomEvent('pwa-prompt-ready', { detail: { key: key, prompt: e } }));
                });

                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    var registerSw = function() {
                      var path = window.location.pathname || '';
                      if (path.startsWith('/admin')) {
                        navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(function(){});
                      } else {
                        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
                      }
                    };
                    if ('requestIdleCallback' in window) {
                      window.requestIdleCallback(registerSw, { timeout: 4000 });
                    } else {
                      setTimeout(registerSw, 2000);
                    }
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${plusJakartaSans.className} font-sans antialiased bg-[var(--bg)] text-[var(--ink)]`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
