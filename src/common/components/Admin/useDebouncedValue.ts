import { useEffect, useState } from "react";

/**
 * Trails `value` by `delayMs`. Keeps every keystroke in the search box from
 * becoming its own request against the users endpoint.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
