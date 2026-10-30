import type { DegradedOverlayState, OverlayDensity, OverlayStateKind } from "./types";

const HOUR_MS = 3_600_000;
const HOURS_PER_DAY = 24;

export function formatPullRequestAge(createdAt: string, now: number): string {
  const ageHours = Math.floor((now - Date.parse(createdAt)) / HOUR_MS);

  if (ageHours < 1) {
    return "< 1 h";
  }

  if (ageHours < HOURS_PER_DAY) {
    return `${ageHours} h`;
  }

  return `${Math.floor(ageHours / HOURS_PER_DAY)} j`;
}

export function formatReviewsToHandle(count: number): string {
  return count === 1 ? "1 review à traiter" : `${count} reviews à traiter`;
}

export function getDegradedState(state: OverlayStateKind): DegradedOverlayState | null {
  return state === "loading" || state === "ok" ? null : state;
}

export function getBodyPaddingClassName(density: OverlayDensity): string {
  if (density === "compact") {
    return "py-1";
  }

  return density === "comfy" ? "py-3" : "py-2";
}
