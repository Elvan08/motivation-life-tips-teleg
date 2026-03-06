import { Bot } from "grammy";
import { cfg } from "./lib/config.js";
import { registerCallbacks } from "./features/callbacks.js";

export function createBot(token) {
  const bot = new Bot(token);

  // Commands are registered by the loader in src/index.js (must be first).
  // Features/callbacks are registered here.
  registerCallbacks(bot, { cfg });

  return bot;
}
