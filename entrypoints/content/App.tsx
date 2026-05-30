import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QueryClientConfig } from "@tanstack/react-query";
import { Component } from "react";
import type { PointerEvent } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import type { TeamReviewCounts } from "../../src/domain";
import { useReviewCounts } from "../../src/ui/hooks/useReviewCounts";

interface OverlayPosition {
  readonly right: number;
  readonly bottom: number;
}

const overlayConfig = {
  storageKey: "vatesReviewCounter.overlayPosition",
  // Default offset follows the design reference: { right: 24, bottom: 24 }.
  defaultOffsetPx: 24,
  // Minimum visible gutter kept while clamping persisted and dragged positions.
  edgeOffsetPx: 8,
  panelWidthPx: 320,
  panelMaxHeightRatio: 0.7,
  planetButtonSizePx: 52,
  planetImageSizePx: 34,
  headerPlanetImageSizePx: 20,
  planetImageUrl: "https://vates.tech/blog/content/images/2022/12/png-vates-planetonly.png",
} as const;
const defaultPosition: OverlayPosition = {
  right: overlayConfig.defaultOffsetPx,
  bottom: overlayConfig.defaultOffsetPx,
};
const overlayPanelClassName =
  "pointer-events-auto fixed flex max-h-[70vh] w-[320px] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] shadow-2xl";
const overlayThemeClassName =
  "[--accent-be:#31a88c] [--accent-fe:#8f82ff] [--badge-hot:#be1622] [--bg:#1a1b38] [--border:#33356a] [--fg-muted:#9b9cc4] [--fg:#fffce4] [--surface:#25274c]";
const queryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
} satisfies QueryClientConfig;

export function OverlayApp() {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));

  return (
    <QueryClientProvider client={queryClient}>
      <OverlayErrorBoundary>
        <OverlayShell />
      </OverlayErrorBoundary>
    </QueryClientProvider>
  );
}

interface OverlayErrorBoundaryProps {
  readonly children: ReactNode;
}

interface OverlayErrorBoundaryState {
  readonly hasError: boolean;
}

class OverlayErrorBoundary extends Component<OverlayErrorBoundaryProps, OverlayErrorBoundaryState> {
  override state: OverlayErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): OverlayErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[Vates Review Counter] Overlay render failed", error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className={`${overlayPanelClassName} ${overlayThemeClassName} px-3 py-4 text-[13px]`}
          role="alert"
          style={{ right: defaultPosition.right, bottom: defaultPosition.bottom }}
        >
          Overlay indisponible.
        </div>
      );
    }

    return this.props.children;
  }
}

function OverlayShell() {
  const reviewCounts = useReviewCounts();
  const [isOpen, setIsOpen] = useState(true);
  const [position, setPosition] = usePersistentOverlayPosition();
  const total = useMemo(() => countRequestedReviews(reviewCounts.data), [reviewCounts.data]);
  const hasAlert = reviewCounts.status === "error";
  const isLoading = reviewCounts.status === "loading";

  if (!isOpen) {
    return (
      <PlanetButton
        hasAlert={hasAlert}
        isLoading={isLoading}
        onClick={() => setIsOpen(true)}
        position={position}
        total={total}
      />
    );
  }

  return (
    <section
      aria-label="Vates Reviews"
      className={`${overlayPanelClassName} ${overlayThemeClassName}`}
      role="dialog"
      style={{ right: position.right, bottom: position.bottom }}
    >
      <OverlayHeader
        isLoading={isLoading}
        onClose={() => setIsOpen(false)}
        onDragPosition={setPosition}
        onRefresh={reviewCounts.refresh}
        position={position}
      />
      <div className="px-3 py-4 text-[13px]">
        <div className="font-semibold">Vates Reviews</div>
        <div className="mt-1 text-[12px] text-[var(--fg-muted)]">
          {reviewCounts.status === "success" ? `${total} reviews demandées` : "Overlay prêt."}
        </div>
      </div>
    </section>
  );
}

function OverlayHeader({
  isLoading,
  onClose,
  onDragPosition,
  onRefresh,
  position,
}: {
  readonly isLoading: boolean;
  readonly onClose: () => void;
  readonly onDragPosition: (position: OverlayPosition) => void;
  readonly onRefresh: () => Promise<void>;
  readonly position: OverlayPosition;
}) {
  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    const target = event.target;

    if (target instanceof Element && target.closest("[data-no-drag]") !== null) {
      return;
    }

    event.preventDefault();

    const start = { x: event.clientX, y: event.clientY, ...position };

    function move(pointerEvent: globalThis.PointerEvent): void {
      onDragPosition(
        normalizePosition({
          right: start.right - (pointerEvent.clientX - start.x),
          bottom: start.bottom - (pointerEvent.clientY - start.y),
        }),
      );
    }

    function stop(): void {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <div
      className="flex h-11 cursor-grab items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-3 active:cursor-grabbing"
      onPointerDown={handlePointerDown}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1a1b38]">
        <img
          alt=""
          className={isLoading ? "animate-spin" : ""}
          draggable="false"
          height={overlayConfig.headerPlanetImageSizePx}
          src={overlayConfig.planetImageUrl}
          width={overlayConfig.headerPlanetImageSizePx}
        />
      </span>
      <span className="text-[13px] font-semibold">Vates Reviews</span>
      <span className="ml-auto flex items-center gap-0.5" data-no-drag>
        <button
          aria-label="Rafraîchir"
          className="grid h-7 w-7 place-items-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--fg)]"
          onClick={() => void onRefresh()}
          type="button"
        >
          <span className={isLoading ? "inline-block animate-spin" : "inline-block"}>⟳</span>
        </button>
        <button
          aria-label="Fermer"
          className="grid h-7 w-7 place-items-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--fg)]"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </span>
    </div>
  );
}

function PlanetButton({
  hasAlert,
  isLoading,
  onClick,
  position,
  total,
}: {
  readonly hasAlert: boolean;
  readonly isLoading: boolean;
  readonly onClick: () => void;
  readonly position: OverlayPosition;
  readonly total: number;
}) {
  return (
    <button
      aria-label="Ouvrir Vates Reviews"
      className="pointer-events-auto fixed grid place-items-center rounded-full border border-[#33356a] bg-[#1a1b38] shadow-2xl transition-transform hover:scale-105 active:scale-95"
      onClick={onClick}
      style={{
        right: position.right,
        bottom: position.bottom,
        width: overlayConfig.planetButtonSizePx,
        height: overlayConfig.planetButtonSizePx,
      }}
      title="Ouvrir Vates Reviews"
      type="button"
    >
      <img
        alt=""
        className={isLoading ? "animate-spin" : ""}
        draggable="false"
        height={overlayConfig.planetImageSizePx}
        src={overlayConfig.planetImageUrl}
        width={overlayConfig.planetImageSizePx}
      />
      {total > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#1a1b38] bg-[#be1622] px-1 text-[11px] font-semibold tabular-nums text-white">
          {total}
        </span>
      )}
      {hasAlert && (
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1a1b38] bg-[#be1622]" />
      )}
    </button>
  );
}

function usePersistentOverlayPosition(): readonly [
  OverlayPosition,
  (position: OverlayPosition) => void,
] {
  const [isLoaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState(defaultPosition);

  useEffect(() => {
    let isActive = true;

    void browser.storage.local
      .get(overlayConfig.storageKey)
      .then((values: Record<string, unknown>) => {
        if (!isActive) {
          return;
        }

        const storedPosition = values[overlayConfig.storageKey];
        setPosition(
          isOverlayPosition(storedPosition) ? normalizePosition(storedPosition) : defaultPosition,
        );
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        console.warn("[Vates Review Counter] Failed to load overlay position", error);
        setPosition(defaultPosition);
        setIsLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    void browser.storage.local.set({ [overlayConfig.storageKey]: position });
  }, [isLoaded, position]);

  return [position, setPosition];
}

function countRequestedReviews(data: TeamReviewCounts | undefined): number {
  if (data === undefined) {
    return 0;
  }

  return [...data.frontend, ...data.backend, ...data.others].reduce(
    (total, reviewCount) => total + reviewCount.count,
    0,
  );
}

function isOverlayPosition(value: unknown): value is OverlayPosition {
  if (typeof value !== "object" || value === null || !("right" in value) || !("bottom" in value)) {
    return false;
  }

  const { bottom, right } = value;

  return (
    typeof right === "number" &&
    Number.isFinite(right) &&
    right >= 0 &&
    typeof bottom === "number" &&
    Number.isFinite(bottom) &&
    bottom >= 0
  );
}

function normalizePosition(position: OverlayPosition): OverlayPosition {
  const bounds = getOverlayPositionBounds();

  return {
    right: clamp(position.right, overlayConfig.edgeOffsetPx, bounds.maxRight),
    bottom: clamp(position.bottom, overlayConfig.edgeOffsetPx, bounds.maxBottom),
  };
}

function getOverlayPositionBounds(): { readonly maxRight: number; readonly maxBottom: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const overlayMaxHeight = viewportHeight * overlayConfig.panelMaxHeightRatio;

  return {
    maxRight: Math.max(
      overlayConfig.edgeOffsetPx,
      viewportWidth - overlayConfig.panelWidthPx - overlayConfig.edgeOffsetPx,
    ),
    maxBottom: Math.max(
      overlayConfig.edgeOffsetPx,
      viewportHeight - overlayMaxHeight - overlayConfig.edgeOffsetPx,
    ),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
