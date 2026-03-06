import { InlineKeyboard } from "grammy";
import { safeReply } from "../lib/send.js";
import { safeErr } from "../lib/safeErr.js";
import {
  getUser,
  updateUser,
  addFavorite,
  removeFavorite,
  DEFAULT_CATEGORIES,
  allowedCategories,
} from "../lib/userStore.js";
import { buildCategoriesKeyboard } from "./categoriesUi.js";
import { makeItemId } from "./items.js";
import { generateMotivation, generateTip } from "./generation.js";

function parseData(prefix, data) {
  const s = String(data || "");
  if (!s.startsWith(prefix)) return null;
  return s.slice(prefix.length);
}

export function registerCallbacks(bot, { cfg }) {
  bot.callbackQuery(/^(cat:toggle:|cat:done|onb:|fav:|gen:|favpage:)/, async (ctx) => {
    const data = ctx.callbackQuery?.data || "";
    const uid = ctx.from?.id;
    if (!uid) return;

    try {
      if (data.startsWith("cat:toggle:")) {
        const raw = decodeURIComponent(parseData("cat:toggle:", data) || "");
        const user = await getUser(cfg.MONGODB_URI, uid);
        const current = new Set((user?.categories || DEFAULT_CATEGORIES).map((c) => String(c)));
        if (current.has(raw)) current.delete(raw);
        else current.add(raw);

        const updated = Array.from(current).filter((c) => allowedCategories().includes(c));
        if (!cfg.MONGODB_URI) {
          await ctx.answerCallbackQuery({ text: "MongoDB not set. Preferences aren’t saved." });
        } else {
          await updateUser(cfg.MONGODB_URI, uid, { categories: updated.length ? updated : DEFAULT_CATEGORIES });
          await ctx.answerCallbackQuery({ text: "Updated" });
        }

        const u2 = await getUser(cfg.MONGODB_URI, uid);
        const kb = buildCategoriesKeyboard(u2?.categories || DEFAULT_CATEGORIES);
        await ctx.editMessageReplyMarkup({ reply_markup: kb });
        return;
      }

      if (data === "cat:done") {
        await ctx.answerCallbackQuery();
        await safeReply(ctx, "All set. Try /motivate or /tip whenever you want.");
        return;
      }

      if (data.startsWith("gen:")) {
        const which = parseData("gen:", data);
        await ctx.answerCallbackQuery();
        if (which !== "motivate" && which !== "tip") return;

        const user = await getUser(cfg.MONGODB_URI, uid);
        const result = which === "motivate"
          ? await generateMotivation({ cfg, user })
          : await generateTip({ cfg, user });

        if (!result.ok) {
          await safeReply(ctx, result.text);
          return;
        }

        const itemId = makeItemId();
        if (cfg.MONGODB_URI) {
          await updateUser(cfg.MONGODB_URI, uid, { lastItem: { itemId, type: which, text: result.text } });
        }

        const kb = new InlineKeyboard()
          .text("Save", "fav:save:" + encodeURIComponent(itemId))
          .text("Another", "gen:" + which)
          .row()
          .text("Change categories", "fav:change_cats");

        await safeReply(ctx, result.text, { reply_markup: kb });
        return;
      }

      if (data === "fav:change_cats") {
        await ctx.answerCallbackQuery();
        const user = await getUser(cfg.MONGODB_URI, uid);
        const kb = buildCategoriesKeyboard(user?.categories || DEFAULT_CATEGORIES);
        await safeReply(ctx, "Pick your categories:", { reply_markup: kb });
        return;
      }

      if (data.startsWith("fav:save:")) {
        await ctx.answerCallbackQuery();
        if (!cfg.MONGODB_URI) {
          await safeReply(ctx, "Favorites need MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
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

        if (res.ok) await safeReply(ctx, "Saved. Use /favorites to see your saved items.");
        else await safeReply(ctx, "Couldn’t save that right now. Try again.");
        return;
      }

      if (data.startsWith("fav:remove:")) {
        await ctx.answerCallbackQuery();
        if (!cfg.MONGODB_URI) {
          await safeReply(ctx, "Favorites need MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
          return;
        }
        const itemId = decodeURIComponent(parseData("fav:remove:", data) || "");
        await removeFavorite(cfg.MONGODB_URI, uid, itemId);
        await safeReply(ctx, "Removed.");
        return;
      }

      if (data.startsWith("favpage:")) {
        await ctx.answerCallbackQuery();
        // pagination handled by /favorites command (callback only nudges user)
        await safeReply(ctx, "Use /favorites again to refresh the list.");
        return;
      }

      if (data.startsWith("onb:")) {
        await ctx.answerCallbackQuery();
        // onboarding callbacks are handled in /start command module
        return;
      }
    } catch (e) {
      console.error("[callbacks] error", { err: safeErr(e) });
      try {
        await ctx.answerCallbackQuery({ text: "Something went wrong" });
      } catch {
        // ignore
      }
    }
  });
}
