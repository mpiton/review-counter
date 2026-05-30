import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_REFRESH_SPINNER_RESET_DELAY_MS = 850;

export function useRefreshSpinner(
  onRefresh: () => Promise<void>,
  resetDelayMs = DEFAULT_REFRESH_SPINNER_RESET_DELAY_MS,
): readonly [boolean, () => void] {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      clearResetTimer(resetTimer);
    };
  }, []);

  const refresh = useCallback(() => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    clearResetTimer(resetTimer);
    void Promise.resolve()
      .then(onRefresh)
      .catch(() => undefined)
      .finally(() => scheduleSpinnerReset(isMounted, resetTimer, setIsRefreshing, resetDelayMs));
  }, [isRefreshing, onRefresh, resetDelayMs]);

  return [isRefreshing, refresh];
}

function scheduleSpinnerReset(
  isMounted: React.RefObject<boolean>,
  resetTimer: React.RefObject<number | null>,
  setIsRefreshing: (isRefreshing: boolean) => void,
  resetDelayMs: number,
): void {
  if (!isMounted.current) {
    return;
  }

  resetTimer.current = window.setTimeout(() => {
    if (isMounted.current) {
      setIsRefreshing(false);
    }

    resetTimer.current = null;
  }, resetDelayMs);
}

function clearResetTimer(resetTimer: React.RefObject<number | null>): void {
  if (resetTimer.current === null) {
    return;
  }

  window.clearTimeout(resetTimer.current);
  resetTimer.current = null;
}
