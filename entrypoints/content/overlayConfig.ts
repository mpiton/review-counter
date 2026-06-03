import { resolveExtensionAssetUrl } from "../../src/ui/runtimeAsset";
import type { OverlayPosition } from "../../src/ui/components";

export const overlayConfig = {
  storageKey: "vatesReviewCounter.overlayPosition",
  openStorageKey: "vatesReviewCounter.overlayOpen",
  defaultOffsetPx: 24,
  edgeOffsetPx: 8,
  panelWidthPx: 320,
  panelMaxHeightRatio: 0.7,
  planetImageUrl: resolveExtensionAssetUrl("icons/vates-planet.png"),
  threshold: 4,
} as const;

export const defaultOverlayPosition: OverlayPosition = {
  right: overlayConfig.defaultOffsetPx,
  bottom: overlayConfig.defaultOffsetPx,
};

export const overlayThemeClassName = "font-sans";

export const fallbackPanelClassName =
  "pointer-events-auto fixed overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] shadow-2xl";

export const fallbackPanelStyle = {
  maxHeight: `${overlayConfig.panelMaxHeightRatio * 100}vh`,
  width: overlayConfig.panelWidthPx,
} as const;

export const overlayUnavailableLabel = "Overlay indisponible.";
