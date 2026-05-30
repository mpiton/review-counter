import type { OverlayPosition } from "../../src/ui/components";

export const overlayConfig = {
  storageKey: "vatesReviewCounter.overlayPosition",
  defaultOffsetPx: 24,
  edgeOffsetPx: 8,
  panelWidthPx: 320,
  panelMaxHeightRatio: 0.7,
  planetImageUrl: "https://vates.tech/blog/content/images/2022/12/png-vates-planetonly.png",
  threshold: 4,
} as const;

export const defaultOverlayPosition: OverlayPosition = {
  right: overlayConfig.defaultOffsetPx,
  bottom: overlayConfig.defaultOffsetPx,
};

export const overlayThemeClassName =
  "[--accent-be:#31a88c] [--accent-fe:#8f82ff] [--badge-hot:#be1622] [--bg:#1a1b38] [--border:#33356a] [--fg-muted:#9b9cc4] [--fg:#fffce4] [--surface:#25274c]";

export const fallbackPanelClassName =
  "pointer-events-auto fixed max-h-[70vh] w-[320px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] shadow-2xl";

export const overlayUnavailableLabel = "Overlay indisponible.";
