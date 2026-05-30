import type { Response as ExtensionResponse } from "../../src/messaging";

export type ConnectionStatus = "idle" | "testing" | "connected" | "error";

export interface StatusView {
  readonly dotClassName: string;
  readonly label: string;
  readonly textClassName: string;
}

export const statusViews: Record<ConnectionStatus, StatusView> = {
  connected: {
    dotClassName: "border-[var(--accent-be)] bg-[var(--accent-be)]",
    label: "connecté",
    textClassName: "text-[var(--accent-be)]",
  },
  error: {
    dotClassName: "border-[var(--badge-hot)] bg-[var(--badge-hot)]",
    label: "échec",
    textClassName: "text-[var(--badge-hot)]",
  },
  idle: {
    dotClassName: "border-[var(--fg-muted)] bg-transparent",
    label: "non configuré",
    textClassName: "text-[var(--fg-muted)]",
  },
  testing: {
    dotClassName: "border-[#d29922] bg-[#d29922]",
    label: "vérification…",
    textClassName: "text-[#d29922]",
  },
};

export function connectionStatusFromResponse(response: ExtensionResponse): ConnectionStatus {
  if (response.kind === "REVIEW_COUNTS") {
    return "connected";
  }

  if (response.kind === "ERROR" && response.reason === "NO_TOKEN") {
    return "idle";
  }

  return "error";
}
