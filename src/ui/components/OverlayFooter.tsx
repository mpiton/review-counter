import type { OverlayStateKind } from "./types";

interface OverlayFooterProps {
  readonly freshness: string | undefined;
  readonly openPullRequestCount: number | undefined;
  readonly state: OverlayStateKind;
}

export function OverlayFooter({ freshness, openPullRequestCount, state }: OverlayFooterProps) {
  return (
    <div className="flex h-8 items-center border-t border-[var(--border)] bg-[var(--bg)] px-3">
      <span className="font-mono text-[11px] text-[var(--fg-muted)]">
        {formatFooterText(state, openPullRequestCount, freshness)}
      </span>
      <span className="ml-auto font-mono text-[10px] text-[var(--fg-muted)] opacity-70">v1.0</span>
    </div>
  );
}

function formatFooterText(
  state: OverlayStateKind,
  openPullRequestCount: number | undefined,
  freshness: string | undefined,
): string {
  if (state === "loading") {
    return "scan en cours...";
  }

  if (state === "ok" || state === "empty") {
    return `${formatPullRequestCount(openPullRequestCount ?? 0)} · maj ${
      freshness ?? "à l'instant"
    }`;
  }

  return "-";
}

function formatPullRequestCount(count: number): string {
  return count <= 1 ? `${count} PR ouverte` : `${count} PR ouvertes`;
}
