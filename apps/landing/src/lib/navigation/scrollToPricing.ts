/** Scroll ke section pricelist / paket (#harga). */
export function scrollToPricingSection(): void {
  const el = document.getElementById("harga");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.location.hash = "harga";
}
