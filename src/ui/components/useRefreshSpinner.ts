import { useCallback, useEffect, useRef, useState } from "react";

export function useRefreshSpinner(onRefresh: () => Promise<void>): readonly [boolean, () => void] {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;

      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const refresh = useCallback(() => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    void onRefresh().finally(() => {
      if (!isMounted.current) {
        return;
      }

      resetTimer.current = window.setTimeout(() => {
        if (isMounted.current) {
          setIsRefreshing(false);
        }
      }, 850);
    });
  }, [isRefreshing, onRefresh]);

  return [isRefreshing, refresh];
}
