import type { DegradedOverlayState, OverlayDensity, OverlayStateKind } from "./types";

export function getDegradedState(state: OverlayStateKind): DegradedOverlayState | null {
  return state === "loading" || state === "ok" ? null : state;
}

export function getBodyPaddingClassName(density: OverlayDensity): string {
  if (density === "compact") {
    return "py-1";
  }

  return density === "comfy" ? "py-3" : "py-2";
}
