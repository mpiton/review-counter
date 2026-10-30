import { formatReviewsToHandle } from "./overlayHelpers";
import type { OverlayPosition, OverlayStateKind } from "./types";

interface PlanetButtonProps {
  readonly onClick: () => void;
  readonly planetImageUrl: string;
  readonly position: OverlayPosition;
  readonly reviewCount: number;
  readonly state: OverlayStateKind;
}

const alertStates = new Set<OverlayStateKind>([
  "no-token",
  "auth-error",
  "rate-limit",
  "network-error",
]);

export function PlanetButton({
  onClick,
  planetImageUrl,
  position,
  reviewCount,
  state,
}: PlanetButtonProps) {
  const hasAlert = alertStates.has(state);
  const isLoading = state === "loading";
  const hasReviews = state === "ok" && reviewCount > 0;
  const label = hasReviews
    ? `Ouvrir Vates Reviews, ${formatReviewsToHandle(reviewCount)}`
    : "Ouvrir Vates Reviews";

  return (
    <button
      aria-label={label}
      className="pointer-events-auto fixed grid h-[52px] w-[52px] place-items-center rounded-full border border-[#33356a] bg-[#1a1b38] shadow-2xl transition-transform hover:scale-105 active:scale-95"
      onClick={onClick}
      style={{ right: position.right, bottom: position.bottom }}
      title={label}
      type="button"
    >
      <img
        alt=""
        className={`h-[34px] w-[34px] ${isLoading ? "animate-spin" : ""}`}
        draggable="false"
        src={planetImageUrl}
      />
      {hasReviews ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#1a1b38] bg-[#be1622] px-1 font-mono text-[11px] font-semibold tabular-nums text-white">
          {reviewCount}
        </span>
      ) : null}
      {hasAlert ? (
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1a1b38] bg-[#be1622]" />
      ) : null}
    </button>
  );
}
