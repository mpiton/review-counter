import type { ReactNode } from "react";
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
  switch (state) {
    case "empty":
      return (
        <StateShell
          desc="Personne n'attend de review. Profitez-en."
          icon="🎉"
          title="Aucune PR ouverte"
        />
      );

    case "no-token":
      return (
        <StateShell
          action={
            <PillButton onClick={onOpenConfiguration} tone="accent">
              Ouvrir la configuration
            </PillButton>
          }
          desc="Un PAT avec le scope public_repo est requis pour compter les reviews."
          icon="🔑"
          title="Configurez votre token GitHub"
        />
      );

    case "auth-error":
      return (
        <StateShell
          action={<PillButton onClick={onOpenConfiguration}>Reconfigurer</PillButton>}
          desc="GitHub a renvoyé 401. Régénérez un token et reconfigurez l'extension."
          icon="⚠️"
          title="Token invalide ou expiré"
        />
      );

    case "rate-limit":
      return (
        <StateShell
          desc="Le quota GitHub est épuisé. Réessayez dans un moment."
          icon="⏳"
          title="Limite API atteinte"
        />
      );

    case "network-error":
      return (
        <StateShell
          action={<PillButton onClick={onRetry}>Réessayer</PillButton>}
          desc="Impossible de joindre l'API GitHub."
          icon="📡"
          title="Connexion impossible"
        />
      );
  }
}
