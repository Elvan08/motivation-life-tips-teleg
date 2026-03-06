import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { getUser, DEFAULT_CATEGORIES } from "../lib/userStore.js";
import { buildCategoriesKeyboard } from "../features/categoriesUi.js";

export default function register(bot) {
  bot.command("categories", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    const user = await getUser(cfg.MONGODB_URI, uid);
    const cats = user?.categories || DEFAULT_CATEGORIES;

    const text = "Your categories right now:\n" + cats.map((c) => "- " + c).join("\n");
    await safeReply(ctx, text, { reply_markup: buildCategoriesKeyboard(cats) });
  });
}
