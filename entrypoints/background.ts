import { browser } from "wxt/browser";
import type { Browser } from "wxt/browser";
import { createMessageHandler } from "../src/messaging/handlers";
import type { Request, Response } from "../src/messaging/protocol";
import { openToolbarPopup } from "../src/messaging/toolbarPopup";

const handleMessage = createMessageHandler({
  openConfigurationPopup,
});

export default defineBackground({
  type: "module",
  main() {
    browser.runtime.onMessage.addListener(handleRuntimeMessage);
  },
});

function handleRuntimeMessage(
  message: Request,
  _sender: Browser.runtime.MessageSender,
  sendResponse: (response?: Response) => void,
): true {
  void handleMessage(message)
    .then((response) => {
      sendResponse(response);
    })
    .catch(() => {
      sendResponse({ kind: "ERROR", reason: "NETWORK" });
    });

  return true;
}

async function openConfigurationPopup(): Promise<void> {
  await openToolbarPopup(browser);
}
