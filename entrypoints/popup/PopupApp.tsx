import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { sendMessage } from "../../src/messaging";
import type { Response as ExtensionResponse } from "../../src/messaging";

type ConnectionStatus = "idle" | "testing" | "connected" | "error";

interface StatusView {
  readonly dotClassName: string;
  readonly label: string;
  readonly textClassName: string;
}

interface TokenFieldProps {
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onToggleReveal: () => void;
  readonly revealToken: boolean;
  readonly token: string;
}

interface StatusIndicatorProps {
  readonly view: StatusView;
}

const statusViews: Record<ConnectionStatus, StatusView> = {
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

const tokenSettingsUrl =
  "https://github.com/settings/tokens/new?scopes=public_repo&description=Vates%20Review%20Counter";
const planetLogoUrl = "https://vates.tech/blog/content/images/2022/12/png-vates-planetonly.png";

export function PopupApp() {
  const [token, setToken] = useState("");
  const [revealToken, setRevealToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("testing");

  useEffect(() => {
    let active = true;

    async function validateStoredToken(): Promise<void> {
      try {
        const response = await sendMessage({ kind: "FETCH_REVIEW_COUNTS", force: true });

        if (active) {
          setStatus(connectionStatusFromResponse(response));
        }
      } catch {
        if (active) {
          setStatus("error");
        }
      }
    }

    void validateStoredToken();

    return () => {
      active = false;
    };
  }, []);

  const trimmedToken = token.trim();
  const canSave = trimmedToken.length > 0 && !saving;
  const statusView = statusViews[status];

  function handleTokenChange(event: ChangeEvent<HTMLInputElement>): void {
    setToken(event.target.value);

    if (status === "error") {
      setStatus("idle");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setSaving(true);
    setStatus("testing");

    try {
      const saveResponse = await sendMessage({ kind: "SET_TOKEN", token: trimmedToken });

      if (saveResponse.kind !== "OK") {
        setStatus("error");

        return;
      }

      const validationResponse = await sendMessage({ kind: "FETCH_REVIEW_COUNTS", force: true });
      const nextStatus = connectionStatusFromResponse(validationResponse);

      setStatus(nextStatus);
      setRevealToken(false);

      if (nextStatus === "connected") {
        setToken("");
      }
    } catch {
      setStatus("error");
      setRevealToken(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="w-[300px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] shadow-2xl [--accent-be:#31a88c] [--accent-fe:#8f82ff] [--badge-hot:#be1622] [--bg:#1a1b38] [--border:#33356a] [--fg-muted:#9b9cc4] [--fg:#fffce4] [--surface:#25274c]">
      <PopupHeader />

      <form className="flex flex-col gap-3 p-4" onSubmit={handleSubmit}>
        <label className="text-[12px] font-semibold" htmlFor="github-token">
          Token GitHub (PAT)
        </label>

        <TokenField
          onChange={handleTokenChange}
          onToggleReveal={() => setRevealToken((current) => !current)}
          revealToken={revealToken}
          token={token}
        />

        <p className="text-[11px] text-[var(--fg-muted)]" id="token-scope-help">
          Scope requis : <span className="font-mono text-[var(--fg)]">public_repo</span>
        </p>

        <div className="mt-1 flex items-center gap-3">
          <button
            className="h-9 rounded-md bg-[var(--accent-fe)] px-4 text-[12px] font-semibold text-white transition-opacity disabled:opacity-40"
            disabled={!canSave}
            type="submit"
          >
            {saving ? "Vérification…" : "Enregistrer"}
          </button>
          <StatusIndicator view={statusView} />
        </div>

        <a
          className="mt-1 font-mono text-[12px] text-[var(--accent-fe)] hover:underline"
          href={tokenSettingsUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          ↗ Générer un token sur GitHub
        </a>
      </form>
    </main>
  );
}

function PopupHeader() {
  return (
    <header className="flex h-11 items-center gap-2 border-b border-[var(--border)] px-4">
      <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-[#1a1b38]">
        <img
          alt=""
          className="pointer-events-none h-5 w-5"
          draggable={false}
          height="20"
          src={planetLogoUrl}
          width="20"
        />
      </span>
      <h1 className="text-[13px] font-semibold">Vates Review Counter</h1>
      <button
        aria-label="Fermer"
        className="ml-auto grid h-7 w-7 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]"
        onClick={() => window.close()}
        type="button"
      >
        ✕
      </button>
    </header>
  );
}

function TokenField({ onChange, onToggleReveal, revealToken, token }: TokenFieldProps) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 transition-colors focus-within:border-[var(--accent-fe)]">
      <input
        aria-describedby="token-scope-help"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-muted)]"
        id="github-token"
        onChange={onChange}
        placeholder="ghp_xxxxxxxxxxxxxxxx"
        spellCheck={false}
        type={revealToken ? "text" : "password"}
        value={token}
      />
      <button
        aria-label={revealToken ? "Masquer le token" : "Afficher le token"}
        className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
        onClick={onToggleReveal}
        type="button"
      >
        {revealToken ? "🙈" : "👁"}
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

function connectionStatusFromResponse(response: ExtensionResponse): ConnectionStatus {
  if (response.kind === "REVIEW_COUNTS") {
    return "connected";
  }

  if (response.kind === "ERROR" && response.reason === "NO_TOKEN") {
    return "idle";
  }

  return "error";
}
