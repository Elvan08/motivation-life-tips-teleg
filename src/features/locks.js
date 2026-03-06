import { cfg } from "../lib/config.js";

const perChat = new Map();
let globalInFlight = 0;

export function tryAcquire(chatId) {
  const c = String(chatId || "");
  if (!c) return { ok: false, reason: "NO_CHAT" };

  const globalCap = 1;
  if (globalInFlight >= globalCap) return { ok: false, reason: "GLOBAL_BUSY" };

  if (perChat.get(c)) return { ok: false, reason: "CHAT_BUSY" };

  perChat.set(c, true);
  globalInFlight++;

  return {
    ok: true,
    release: () => {
      if (perChat.get(c)) perChat.delete(c);
      globalInFlight = Math.max(0, globalInFlight - 1);
    },
  };
}

export function lockMessage(reason) {
  if (reason === "CHAT_BUSY") return "I’m working on your last request. One moment.";
  if (reason === "GLOBAL_BUSY") return "I’m a bit busy right now. Try again in a moment.";
  return "Try again in a moment.";
}
