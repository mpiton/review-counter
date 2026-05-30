import { browser } from "wxt/browser";
import { createMessageHandler } from "../src/messaging/handlers";
import type { Request, Response } from "../src/messaging/protocol";

const handleMessage = createMessageHandler();

export default defineBackground({
  type: "module",
  main() {
    browser.runtime.onMessage.addListener((message: Request): Promise<Response> => {
      return handleMessage(message);
    });
  },
});
