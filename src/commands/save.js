import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { getUser, addFavorite } from "../lib/userStore.js";

export default function register(bot) {
  bot.command("save", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "Saving favorites needs MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
      return;
    }

    const user = await getUser(cfg.MONGODB_URI, uid);
    const last = user?.lastItem;
    if (!last?.text) {
      await safeReply(ctx, "I don’t have a recent item to save. Try /motivate or /tip first.");
      return;
    }

    const res = await addFavorite(cfg.MONGODB_URI, uid, {
      itemId: String(last.itemId || ""),
      type: String(last.type || ""),
      text: String(last.text || ""),
    });

    if (res.ok) await safeReply(ctx, "Saved. Use /favorites to see them.");
    else await safeReply(ctx, "Couldn’t save right now. Try again.");
  });
}
