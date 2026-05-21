"use client";

import { useEffect, useRef } from "react";

/**
 * Debounce a callback by `delay` ms. Use for autosave.
 */
export function useDebouncedEffect(
  effect: () => void | Promise<void>,
  deps: unknown[],
  delay = 600
) {
  const cb = useRef(effect);
  cb.current = effect;

  useEffect(() => {
    const t = setTimeout(() => {
      cb.current();
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
