import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";

interface UsePersistentStateOptions<T> {
  readonly storageKey: string;
  readonly fallback: T;
  readonly isValid: (value: unknown) => value is T;
  readonly normalize?: (value: T) => T;
}

/**
 * Mirrors a piece of state into `browser.storage.local` so it survives page
 * reloads. The value starts at `fallback`, is replaced once storage resolves,
 * and is written back on every change. `isLoaded` lets callers gate rendering
 * until the persisted value is known, avoiding a flash of the default state.
 */
export function usePersistentState<T>({
  storageKey,
  fallback,
  isValid,
  normalize,
}: UsePersistentStateOptions<T>): readonly [T, (next: T) => void, boolean] {
  const normalizeValue = useCallback(
    (value: T): T => (normalize === undefined ? value : normalize(value)),
    [normalize],
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [value, setValue] = useState<T>(() => normalizeValue(fallback));
  const updateValue = useCallback(
    (next: T): void => {
      setValue(normalizeValue(next));
    },
    [normalizeValue],
  );

  useEffect(() => {
    let isActive = true;

    void browser.storage.local
      .get(storageKey)
      .then((values: Record<string, unknown>) => {
        if (!isActive) {
          return;
        }

        const storedValue = values[storageKey];
        setValue(normalizeValue(isValid(storedValue) ? storedValue : fallback));
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        console.warn(`[Vates Review Counter] Failed to load ${storageKey}`, error);
        setValue(normalizeValue(fallback));
        setIsLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, [storageKey, fallback, isValid, normalizeValue]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    void browser.storage.local.set({ [storageKey]: value });
  }, [isLoaded, storageKey, value]);

  return [value, updateValue, isLoaded] as const;
}
