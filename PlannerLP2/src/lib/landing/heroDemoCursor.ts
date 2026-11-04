/** Titik tap dalam koordinat lokal stage (390×844), aman saat ancestor pakai CSS scale (PhoneMockup). */
export function tapPointInStage(
  stage: HTMLElement,
  el: HTMLElement,
  anchor: { x: number; y: number } = { x: 0.5, y: 0.5 },
): { x: number; y: number } {
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  if (sr.width <= 0 || sr.height <= 0) {
    return { x: 0, y: 0 };
  }
  const scaleX = stage.offsetWidth / sr.width;
  const scaleY = stage.offsetHeight / sr.height;
  return {
    x: (er.left - sr.left + er.width * anchor.x) * scaleX,
    y: (er.top - sr.top + er.height * anchor.y) * scaleY,
  };
}

export function afterLayoutPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
