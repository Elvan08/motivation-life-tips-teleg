import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { listHistory } from "../lib/userStore.js";
import { formatHistoryItem } from "../features/items.js";

export default function register(bot) {
  bot.command("history", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "History needs MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
      return;
    }

    const res = await listHistory(cfg.MONGODB_URI, uid, { limit: 10 });
    if (!res.ok) {
      await safeReply(ctx, "Couldn’t load history right now.");
      return;
    }

    if (!res.rows.length) {
      await safeReply(ctx, "No history yet. Try /motivate or /tip.");
      return;
    }

    const text = res.rows.map(formatHistoryItem).join("\n");
    await safeReply(ctx, text);
  });
}
