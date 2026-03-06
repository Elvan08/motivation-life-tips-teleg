import { InlineKeyboard } from "grammy";
import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { listFavorites } from "../lib/userStore.js";
import { snippet } from "../features/items.js";

export default function register(bot) {
  bot.command("favorites", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "Favorites need MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
      return;
    }

    const page = 0;
    const limit = 5;
    const res = await listFavorites(cfg.MONGODB_URI, uid, { limit, skip: page * limit });

    if (!res.ok) {
      await safeReply(ctx, "Couldn’t load favorites right now.");
      return;
    }

    if (!res.rows.length) {
      await safeReply(ctx, "No favorites yet. Use /motivate or /tip, then tap Save.");
      return;
    }

    for (const row of res.rows) {
      const kb = new InlineKeyboard().text("Remove", "fav:remove:" + encodeURIComponent(String(row.itemId)));
      const text = `[${String(row.type)}] ${snippet(row.text, 600)}`;
      await safeReply(ctx, text, { reply_markup: kb });
    }

    await safeReply(ctx, `Showing ${res.rows.length} of ${res.total}. Run /favorites again for the latest.`);
  });
}
