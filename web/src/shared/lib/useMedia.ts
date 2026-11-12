import { useSyncExternalStore } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const queries = {
  desktop: '(min-width: 1200px)',
  tablet: '(min-width: 768px)',
};

function read(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia(queries.desktop).matches) return 'desktop';
  if (window.matchMedia(queries.tablet).matches) return 'tablet';
  return 'mobile';
}

function subscribe(cb: () => void) {
  const lists = Object.values(queries).map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener('change', cb));
  return () => lists.forEach((l) => l.removeEventListener('change', cb));
}

/** Breakpoint theo đặc tả: desktop ≥1200, tablet 768–1199, mobile <768. */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, read, () => 'desktop');
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const l = window.matchMedia(query);
      l.addEventListener('change', cb);
      return () => l.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
export const useCanHover = () => useMediaQuery('(hover: hover) and (pointer: fine)');
