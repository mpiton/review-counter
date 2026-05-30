import { useCallback, useEffect, useRef, useState } from "react";

export function useRefreshSpinner(onRefresh: () => Promise<void>): readonly [boolean, () => void] {
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
      .finally(() => scheduleSpinnerReset(isMounted, resetTimer, setIsRefreshing));
  }, [isRefreshing, onRefresh]);

  return [isRefreshing, refresh];
}

function scheduleSpinnerReset(
  isMounted: React.RefObject<boolean>,
  resetTimer: React.RefObject<number | null>,
  setIsRefreshing: (isRefreshing: boolean) => void,
): void {
  if (!isMounted.current) {
    return;
  }

  resetTimer.current = window.setTimeout(() => {
    if (isMounted.current) {
      setIsRefreshing(false);
    }

    resetTimer.current = null;
  }, 850);
}

function clearResetTimer(resetTimer: React.RefObject<number | null>): void {
  if (resetTimer.current === null) {
    return;
  }

  window.clearTimeout(resetTimer.current);
  resetTimer.current = null;
}
