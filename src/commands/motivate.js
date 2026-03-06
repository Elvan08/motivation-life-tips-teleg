import { InlineKeyboard } from "grammy";
import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { getUser, updateUser, addHistory } from "../lib/userStore.js";
import { generateMotivation } from "../features/generation.js";
import { makeItemId } from "../features/items.js";
import { tryAcquire, lockMessage } from "../features/locks.js";

export default function register(bot) {
  bot.command("motivate", async (ctx) => {
    const uid = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!uid || !chatId) return;

    const lock = tryAcquire(chatId);
    if (!lock.ok) {
      await safeReply(ctx, lockMessage(lock.reason));
      return;
    }

    try {
      if (!cfg.COOKMYBOTS_AI_ENDPOINT || !cfg.COOKMYBOTS_AI_KEY) {
        await safeReply(ctx, "AI isn’t configured yet. Set COOKMYBOTS_AI_ENDPOINT and COOKMYBOTS_AI_KEY.");
        return;
      }

      const user = await getUser(cfg.MONGODB_URI, uid);
      const result = await generateMotivation({ cfg, user });

      if (!result.ok) {
        await safeReply(ctx, result.text);
        return;
      }

      const itemId = makeItemId();
      if (cfg.MONGODB_URI) {
        await updateUser(cfg.MONGODB_URI, uid, { lastItem: { itemId, type: "motivate", text: result.text } });
        await addHistory(cfg.MONGODB_URI, uid, { itemId, type: "motivate", text: result.text });
      }

      const kb = new InlineKeyboard()
        .text("Save", "fav:save:" + encodeURIComponent(itemId))
        .text("Another", "gen:motivate")
        .row()
        .text("Change categories", "fav:change_cats");

      await safeReply(ctx, result.text, { reply_markup: kb });
    } finally {
      lock.release();
    }
  });
}
