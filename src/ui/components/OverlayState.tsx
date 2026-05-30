import type { ReactNode } from "react";
import { overlayStateContent } from "./overlayStateContent";
import type { DegradedOverlayState } from "./types";

interface StateShellProps {
  readonly action?: ReactNode;
  readonly desc?: string;
  readonly icon: string;
  readonly title: string;
}

interface PillButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly tone?: "accent" | "neutral";
}

interface OverlayStateProps {
  readonly onOpenConfiguration: () => void;
  readonly onRetry: () => void;
  readonly state: DegradedOverlayState;
}

export function StateShell({ action, desc, icon, title }: StateShellProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-9 text-center">
      <div className="mb-1 text-[26px] leading-none">{icon}</div>
      <div className="text-[13px] font-semibold text-[var(--fg)]">{title}</div>
      {desc === undefined ? null : (
        <div className="max-w-[230px] text-[12px] leading-relaxed text-[var(--fg-muted)]">
          {desc}
        </div>
      )}
      {action === undefined ? null : <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PillButton({ children, onClick, tone = "neutral" }: PillButtonProps) {
  const className =
    tone === "accent"
      ? "border-transparent bg-[var(--accent-fe)] text-white"
      : "border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface)]";

  return (
    <button
      className={`h-8 rounded-md border px-3.5 text-[12px] font-semibold transition-colors ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function OverlayState({ onOpenConfiguration, onRetry, state }: OverlayStateProps) {
  const content = overlayStateContent[state];

  return (
    <StateShell
      action={createAction(state, content.actionLabel, content.actionTone, {
        onOpenConfiguration,
        onRetry,
      })}
      desc={content.desc}
      icon={content.icon}
      title={content.title}
    />
  );
}

function createAction(
  state: DegradedOverlayState,
  label: string | undefined,
  tone: "accent" | "neutral" | undefined,
  actions: Pick<OverlayStateProps, "onOpenConfiguration" | "onRetry">,
): ReactNode {
  if (label === undefined) {
    return undefined;
  }

  const onClick = state === "network-error" ? actions.onRetry : actions.onOpenConfiguration;

  return (
    <PillButton onClick={onClick} tone={tone}>
      {label}
    </PillButton>
  );
}
