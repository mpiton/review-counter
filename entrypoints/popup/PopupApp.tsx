import { sendMessage } from "../../src/messaging";
import { useEffect, useRef, useState } from "react";
import { connectionStatusFromResponse } from "./connectionStatus";
import type { ConnectionStatus } from "./connectionStatus";
import { PopupHeader } from "./PopupHeader";
import { TokenForm } from "./TokenForm";

export function PopupApp() {
  const activeRef = useRef(false);
  const [status, setStatus] = useState<ConnectionStatus>("testing");

  useEffect(() => {
    activeRef.current = true;

    async function validateStoredToken(): Promise<void> {
      try {
        const response = await sendMessage({ kind: "FETCH_REVIEW_COUNTS", force: true });

        if (activeRef.current) {
          setStatus(connectionStatusFromResponse(response));
        }
      } catch {
        if (activeRef.current) {
          setStatus("error");
        }
      }
    }

    void validateStoredToken();

    return () => {
      activeRef.current = false;
    };
  }, []);

  async function saveAndValidateToken(token: string): Promise<ConnectionStatus> {
    const saveResponse = await sendMessage({ kind: "SET_TOKEN", token });

    if (saveResponse.kind !== "OK") {
      return "error";
    }

    const validationResponse = await sendMessage({ kind: "FETCH_REVIEW_COUNTS", force: true });

    return connectionStatusFromResponse(validationResponse);
  }

  return (
    <main className="w-[300px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] shadow-2xl [--accent-be:#31a88c] [--accent-fe:#8f82ff] [--badge-hot:#be1622] [--bg:#1a1b38] [--border:#33356a] [--fg-muted:#9b9cc4] [--fg:#fffce4] [--surface:#25274c]">
      <PopupHeader />
      <TokenForm onSaveToken={saveAndValidateToken} onStatusChange={setStatus} status={status} />
    </main>
  );
}
