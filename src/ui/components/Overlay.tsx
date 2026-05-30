import type { PointerEvent } from "react";
import { useEffect } from "react";
import type { TeamReviewCounts } from "../../domain";
import { LoadingSections } from "./LoadingSections";
import { OverlayFooter } from "./OverlayFooter";
import { OverlayHeader } from "./OverlayHeader";
import { OverlayState } from "./OverlayState";
import { Section } from "./Section";
import { getBodyPaddingClassName, getDegradedState } from "./overlayHelpers";
import type { OverlayDensity, OverlayPosition, OverlayStateKind } from "./types";
import { DEFAULT_REFRESH_SPINNER_RESET_DELAY_MS, useRefreshSpinner } from "./useRefreshSpinner";

interface OverlayProps {
  readonly className?: string;
  readonly data: TeamReviewCounts | undefined;
  readonly density?: OverlayDensity;
  readonly freshness: string | undefined;
  readonly onClose: () => void;
  readonly onOpenConfiguration: () => void;
  readonly onPositionChange: (position: OverlayPosition) => void;
  readonly onRefresh: () => Promise<void>;
  readonly openPullRequestCount: number | undefined;
  readonly planetImageUrl: string;
  readonly position: OverlayPosition;
  readonly refreshSpinnerResetDelayMs?: number;
  readonly state: OverlayStateKind;
  readonly threshold?: number;
}

export function Overlay({
  className = "",
  data,
  density = "regular",
  freshness,
  onClose,
  onOpenConfiguration,
  onPositionChange,
  onRefresh,
  openPullRequestCount,
  planetImageUrl,
  position,
  refreshSpinnerResetDelayMs = DEFAULT_REFRESH_SPINNER_RESET_DELAY_MS,
  state,
  threshold = 4,
}: OverlayProps) {
  const [isRefreshing, refresh] = useRefreshSpinner(onRefresh, refreshSpinnerResetDelayMs);
  const degradedState = getDegradedState(state);
  const isLoading = state === "loading";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    const target = event.target;

    if (target instanceof Element && target.closest("[data-no-drag]") !== null) {
      return;
    }

    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, ...position };

    function move(pointerEvent: globalThis.PointerEvent): void {
      onPositionChange({
        right: start.right - (pointerEvent.clientX - start.x),
        bottom: start.bottom - (pointerEvent.clientY - start.y),
      });
    }

    function stop(): void {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <section
      aria-label="Vates Reviews"
      className={`pointer-events-auto fixed flex max-h-[70vh] w-[320px] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] shadow-2xl ${className}`}
      role="dialog"
      style={{ right: position.right, bottom: position.bottom }}
      tabIndex={-1}
    >
      <OverlayHeader
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onClose={onClose}
        onPointerDown={handlePointerDown}
        onRefresh={refresh}
        planetImageUrl={planetImageUrl}
      />
      <div className={`flex-1 overflow-y-auto ${getBodyPaddingClassName(density)}`}>
        {isLoading ? <LoadingSections /> : null}
        {state === "ok" && data !== undefined ? (
          <>
            <Section
              label="FRONTEND"
              members={data.frontend}
              threshold={threshold}
              tone="frontend"
            />
            <Section label="BACKEND" members={data.backend} threshold={threshold} tone="backend" />
            <Section label="AUTRES" members={data.others} threshold={threshold} tone="muted" />
            <div className="h-1.5" />
          </>
        ) : null}
        {degradedState === null ? null : (
          <OverlayState
            onOpenConfiguration={onOpenConfiguration}
            onRetry={refresh}
            state={degradedState}
          />
        )}
      </div>
      <OverlayFooter
        freshness={freshness}
        openPullRequestCount={openPullRequestCount}
        state={state}
      />
    </section>
  );
}
