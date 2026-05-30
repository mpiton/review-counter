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

    void sendMessage({ kind: "FETCH_REVIEW_COUNTS", force: true })
      .then((response) => {
        if (activeRef.current) {
          setStatus(connectionStatusFromResponse(response));
        }
      })
      .catch(() => {
        if (activeRef.current) {
          setStatus("error");
        }
      });

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
    <main className="w-[300px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] font-sans text-[var(--fg)] shadow-2xl">
      <PopupHeader />
      <TokenForm onSaveToken={saveAndValidateToken} onStatusChange={setStatus} status={status} />
    </main>
  );
}
