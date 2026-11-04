import { useEffect, useState } from 'react';

/**
 * A low-frequency clock for "last updated 12s ago" labels. Keeping it in one
 * hook avoids adding a timer to every component that renders a timestamp.
 */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
