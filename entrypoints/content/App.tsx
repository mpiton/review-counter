import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QueryClientConfig } from "@tanstack/react-query";
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import type { TeamReviewCounts } from "../../src/domain";
import type { MessageErrorReason } from "../../src/messaging";
import { sendMessage } from "../../src/messaging";
import { Overlay, PlanetButton } from "../../src/ui/components";
import type { OverlayPosition, OverlayStateKind } from "../../src/ui/components";
import { useReviewCounts } from "../../src/ui/hooks/useReviewCounts";
import {
  defaultOverlayPosition,
  fallbackPanelClassName,
  fallbackPanelStyle,
  overlayConfig,
  overlayThemeClassName,
  overlayUnavailableLabel,
} from "./overlayConfig";

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
          className={`${fallbackPanelClassName} ${overlayThemeClassName} px-3 py-4 text-[13px]`}
          role="alert"
          style={{
            ...fallbackPanelStyle,
            right: defaultOverlayPosition.right,
            bottom: defaultOverlayPosition.bottom,
          }}
        >
          {overlayUnavailableLabel}
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
  const freshness = useCacheFreshness(reviewCounts.meta?.fetchedAt);
  const total = useMemo(() => countRequestedReviews(reviewCounts.data), [reviewCounts.data]);
  const state = getOverlayState(
    reviewCounts.status,
    reviewCounts.error?.reason ?? null,
    reviewCounts.meta?.openPullRequestCount,
  );
  const openConfiguration = useCallback(() => {
    void sendMessage({ kind: "OPEN_CONFIGURATION" }).catch((error: unknown) => {
      console.warn("[Vates Review Counter] Failed to open configuration", error);
    });
  }, []);

  if (!isOpen) {
    return (
      <PlanetButton
        onClick={() => setIsOpen(true)}
        planetImageUrl={overlayConfig.planetImageUrl}
        position={position}
        state={state}
        total={total}
      />
    );
  }

  return (
    <Overlay
      className={overlayThemeClassName}
      data={reviewCounts.data}
      freshness={freshness}
      onClose={() => setIsOpen(false)}
      onOpenConfiguration={openConfiguration}
      onPositionChange={setPosition}
      onRefresh={reviewCounts.refresh}
      openPullRequestCount={reviewCounts.meta?.openPullRequestCount}
      planetImageUrl={overlayConfig.planetImageUrl}
      position={position}
      state={state}
      threshold={overlayConfig.threshold}
    />
  );
}

function usePersistentOverlayPosition(): readonly [
  OverlayPosition,
  (position: OverlayPosition) => void,
] {
  const [isLoaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState(() => normalizePosition(defaultOverlayPosition));
  const updatePosition = useCallback((nextPosition: OverlayPosition) => {
    setPosition(normalizePosition(nextPosition));
  }, []);

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
          isOverlayPosition(storedPosition)
            ? normalizePosition(storedPosition)
            : normalizePosition(defaultOverlayPosition),
        );
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        console.warn("[Vates Review Counter] Failed to load overlay position", error);
        setPosition(normalizePosition(defaultOverlayPosition));
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

  return [position, updatePosition];
}

function useCacheFreshness(fetchedAt: number | undefined): string | undefined {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (fetchedAt === undefined) {
    return undefined;
  }

  return formatCacheFreshness(fetchedAt, now);
}

function getOverlayState(
  status: "loading" | "error" | "success",
  reason: MessageErrorReason | null,
  openPullRequestCount: number | undefined,
): OverlayStateKind {
  if (status === "loading") {
    return "loading";
  }

  if (status === "error") {
    return getErrorOverlayState(reason);
  }

  return openPullRequestCount === 0 ? "empty" : "ok";
}

function getErrorOverlayState(reason: MessageErrorReason | null): OverlayStateKind {
  switch (reason) {
    case "AUTH":
      return "auth-error";
    case "NO_TOKEN":
      return "no-token";
    case "RATE_LIMIT":
      return "rate-limit";
    case "NETWORK":
    case null:
      return "network-error";
  }
}

function countRequestedReviews(data: TeamReviewCounts | undefined): number {
  if (data === undefined) {
    return 0;
  }

  return [...data.frontend, ...data.backend, ...data.others].reduce(
    (totalReviews, reviewCount) => totalReviews + reviewCount.count,
    0,
  );
}

function formatCacheFreshness(fetchedAt: number, now: number): string {
  const ageSeconds = Math.max(0, Math.floor((now - fetchedAt) / 1_000));

  if (ageSeconds < 5) {
    return "à l'instant";
  }

  if (ageSeconds < 60) {
    return `il y a ${ageSeconds} s`;
  }

  const ageMinutes = Math.floor(ageSeconds / 60);

  return `il y a ${ageMinutes} min`;
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
