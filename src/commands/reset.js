import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { clearUserMemory } from "../lib/memory.js";

export default function register(bot) {
  bot.command("reset", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "MongoDB isn’t configured, so there’s no stored AI context to clear.");
      return;
    }

    await clearUserMemory({
      mongoUri: cfg.MONGODB_URI,
      platform: "telegram",
      userId: uid,
      chatId: ctx.chat?.id,
    });

    await safeReply(ctx, "Cleared AI context memory for this chat.");
  });
}
