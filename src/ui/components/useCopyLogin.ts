import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_COPY_FEEDBACK_DELAY_MS = 1200;

/**
 * Copies a reviewer login to the clipboard and exposes a short-lived "copied" flag.
 *
 * @remarks
 * - The flag is only raised once the clipboard write resolves, so a rejected write never
 *   reports a false success. A rejection leaves the row untouched instead of surfacing an
 *   error state: the copy is a convenience shortcut, the login stays readable on screen.
 * - `writeText` is called synchronously from the click handler to keep the transient user
 *   activation that browsers require for clipboard access.
 */
export function useCopyLogin(
  login: string,
  feedbackDelayMs = DEFAULT_COPY_FEEDBACK_DELAY_MS,
): readonly [boolean, () => void] {
  const [isCopied, setIsCopied] = useState(false);
  const isMounted = useRef(true);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      clearResetTimer(resetTimer);
    };
  }, []);

  const copy = useCallback(() => {
    void writeToClipboard(login)
      .then(() => {
        if (!isMounted.current) {
          return;
        }

        setIsCopied(true);
        clearResetTimer(resetTimer);
        resetTimer.current = window.setTimeout(() => {
          setIsCopied(false);
          resetTimer.current = null;
        }, feedbackDelayMs);
      })
      .catch(() => undefined);
  }, [feedbackDelayMs, login]);

  return [isCopied, copy];
}

async function writeToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function clearResetTimer(resetTimer: React.RefObject<number | null>): void {
  if (resetTimer.current === null) {
    return;
  }

  window.clearTimeout(resetTimer.current);
  resetTimer.current = null;
}
