type MatchMedia = (query: string) => { matches: boolean };

export function detectStandalone(nav: { standalone?: boolean } | undefined, matchMedia: MatchMedia | undefined): boolean {
  if (nav?.standalone === true) return true; // iPhone Safari home-screen app
  try {
    return matchMedia?.('(display-mode: standalone)').matches ?? false;
  } catch {
    return false;
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const matchMedia = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined;
  return detectStandalone(navigator as Navigator & { standalone?: boolean }, matchMedia);
}
