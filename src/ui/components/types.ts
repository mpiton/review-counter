export interface OverlayPosition {
  readonly right: number;
  readonly bottom: number;
}

export type OverlayDensity = "compact" | "regular" | "comfy";

export type OverlayStateKind =
  | "loading"
  | "ok"
  | "empty"
  | "no-token"
  | "auth-error"
  | "rate-limit"
  | "network-error";

export type DegradedOverlayState = Exclude<OverlayStateKind, "loading" | "ok">;

export type SectionTone = "frontend" | "backend" | "muted";
