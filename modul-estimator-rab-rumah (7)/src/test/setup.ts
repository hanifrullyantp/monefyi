// Polyfill ringan untuk test UI di jsdom (tidak berpengaruh pada test node).
if (typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  if (!w.ResizeObserver) w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
if (typeof window !== "undefined") {
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  }
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = function scrollTo() {};
  }
}
export {};
