import { InlineKeyboard } from "grammy";
import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { getUser, updateUser, addHistory } from "../lib/userStore.js";
import { generateMotivation } from "../features/generation.js";
import { makeItemId } from "../features/items.js";

const MOODS = ["Great", "Okay", "Stressed", "Sad", "Unmotivated", "Angry", "Anxious"];

export default function register(bot) {
  bot.command("mood", async (ctx) => {
    const kb = new InlineKeyboard();
    for (const m of MOODS) {
      kb.text(m, "mood:set:" + encodeURIComponent(m));
      kb.row();
    }
    await safeReply(ctx, "How are you feeling right now?", { reply_markup: kb });
  });

  bot.callbackQuery(/^(mood:set:)/, async (ctx) => {
    const uid = ctx.from?.id;
    const data = String(ctx.callbackQuery?.data || "");
    if (!uid) return;

    await ctx.answerCallbackQuery();

    const mood = decodeURIComponent(data.slice("mood:set:".length));

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "I can respond, but I can’t store mood without MongoDB (MONGODB_URI).");
    } else {
      await updateUser(cfg.MONGODB_URI, uid, { lastMood: mood, lastMoodAt: new Date() });
    }

    if (!cfg.COOKMYBOTS_AI_ENDPOINT || !cfg.COOKMYBOTS_AI_KEY) {
      await safeReply(ctx, `Got it: ${mood}. AI isn’t configured yet, so I can’t generate a tailored message.`);
      return;
    }

    const user = await getUser(cfg.MONGODB_URI, uid);
    const result = await generateMotivation({ cfg, user, extraUserText: `My mood is: ${mood}` });
    if (!result.ok) {
      await safeReply(ctx, result.text);
      return;
    }

    const itemId = makeItemId();
    if (cfg.MONGODB_URI) {
      await updateUser(cfg.MONGODB_URI, uid, { lastItem: { itemId, type: "motivate", text: result.text } });
      await addHistory(cfg.MONGODB_URI, uid, { itemId, type: "motivate", text: result.text });
    }

    await safeReply(ctx, result.text);
  });
}
