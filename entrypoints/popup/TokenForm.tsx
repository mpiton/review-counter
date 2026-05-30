import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { statusViews } from "./connectionStatus";
import type { ConnectionStatus, StatusView } from "./connectionStatus";
import { GITHUB_TOKEN_MAX_LENGTH, TOKEN_REVEAL_DURATION_MS, TOKEN_SETTINGS_URL } from "./constants";

/** Props that connect the token form to background-owned persistence and validation state. */
interface TokenFormProps {
  readonly onSaveToken: (token: string) => Promise<ConnectionStatus>;
  readonly onStatusChange: (status: ConnectionStatus) => void;
  readonly status: ConnectionStatus;
}

/** Props for the controlled PAT password field and its explicit reveal/hide control. */
interface TokenFieldProps {
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onToggleReveal: () => void;
  readonly revealToken: boolean;
  readonly token: string;
}

/** Props for rendering the compact connection state badge beside the save action. */
interface StatusIndicatorProps {
  readonly view: StatusView;
}

export function TokenForm({ onSaveToken, onStatusChange, status }: TokenFormProps) {
  const [token, setToken] = useState("");
  const [revealToken, setRevealToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const trimmedToken = token.trim();
  const canSave = trimmedToken.length > 0 && !saving;

  useEffect(() => {
    if (!revealToken) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRevealToken(false);
    }, TOKEN_REVEAL_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [revealToken]);

  const handleTokenChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setToken(event.target.value);

      if (status === "error") {
        onStatusChange("idle");
      }
    },
    [onStatusChange, status],
  );

  const handleRevealToggle = useCallback((): void => {
    setRevealToken((current) => !current);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (!canSave) {
        return;
      }

      setSaving(true);
      setRevealToken(false);
      onStatusChange("testing");

      try {
        const nextStatus = await onSaveToken(trimmedToken);

        onStatusChange(nextStatus);

        if (nextStatus === "connected") {
          setToken("");
        }
      } catch {
        onStatusChange("error");
      } finally {
        setSaving(false);
      }
    },
    [canSave, onSaveToken, onStatusChange, trimmedToken],
  );

  return (
    <form className="flex flex-col gap-3 p-4" onSubmit={handleSubmit}>
      <label className="text-[12px] font-semibold" htmlFor="github-token">
        Token GitHub (PAT)
      </label>

      <TokenField
        onChange={handleTokenChange}
        onToggleReveal={handleRevealToggle}
        revealToken={revealToken}
        token={token}
      />

      <p className="text-[11px] text-[var(--fg-muted)]" id="token-scope-help">
        Scope requis : <span className="font-mono text-[var(--fg)]">public_repo</span>
      </p>

      <div className="mt-1 flex items-center gap-3">
        <button
          className="h-9 rounded-md bg-[var(--accent-fe)] px-4 text-[12px] font-semibold text-[var(--on-accent)] transition-opacity disabled:opacity-40"
          disabled={!canSave}
          type="submit"
        >
          {saving ? "Vérification…" : "Enregistrer"}
        </button>
        <StatusIndicator view={statusViews[status]} />
      </div>

      <a
        className="mt-1 font-mono text-[12px] text-[var(--fg)] underline decoration-[var(--accent-fe)] decoration-2 underline-offset-2 hover:decoration-[var(--fg)]"
        href={TOKEN_SETTINGS_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        ↗ Générer un token sur GitHub
      </a>
    </form>
  );
}

function TokenField({ onChange, onToggleReveal, revealToken, token }: TokenFieldProps) {
  const toggleLabel = revealToken ? "Masquer" : "Afficher";

  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 transition-colors focus-within:border-[var(--accent-fe)]">
      <input
        aria-describedby="token-scope-help"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)]"
        id="github-token"
        maxLength={GITHUB_TOKEN_MAX_LENGTH}
        onChange={onChange}
        placeholder="Saisir votre PAT GitHub"
        spellCheck={false}
        type={revealToken ? "text" : "password"}
        value={token}
      />
      <button
        aria-label={`${toggleLabel} le token`}
        className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--fg)] hover:text-[var(--fg)]"
        onClick={onToggleReveal}
        type="button"
      >
        <span aria-hidden="true" className="text-[13px]">
          {revealToken ? "🙈" : "👁"}
        </span>
        <span>{toggleLabel}</span>
      </button>
    </div>
  );
}

function StatusIndicator({ view }: StatusIndicatorProps) {
  return (
    <span
      aria-live="polite"
      className={`flex items-center gap-1.5 text-[12px] ${view.textClassName}`}
    >
      <span className={`h-2 w-2 rounded-full border ${view.dotClassName}`} />
      {view.label}
    </span>
  );
}
