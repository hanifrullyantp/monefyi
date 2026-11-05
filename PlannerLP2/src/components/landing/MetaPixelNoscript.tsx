import { META_PIXEL_ID } from "@/lib/analytics/metaPixel";

/** Fallback PageView untuk browser tanpa JS. */
export function MetaPixelNoscript() {
  const id = META_PIXEL_ID;
  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
