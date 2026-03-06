import { InlineKeyboard } from "grammy";
import { safeReply } from "../lib/send.js";
import { cfg } from "../lib/config.js";
import { getUser, updateUser, DEFAULT_CATEGORIES } from "../lib/userStore.js";
import { buildCategoriesKeyboard } from "../features/categoriesUi.js";
import { setOnboardingState, getOnboardingState, clearOnboardingState, setRemindState, clearRemindState } from "../features/state.js";
import { parseTimeHHMM, isValidIanaTimezone } from "../lib/userStore.js";

export default function register(bot) {
  bot.command("start", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    if (cfg.MONGODB_URI) {
      await getUser(cfg.MONGODB_URI, uid);
    }

    await safeReply(
      ctx,
      "Hi. I can send motivational messages and practical life tips tailored to what you care about.\n\nFirst, pick the categories you want:",
      { reply_markup: buildCategoriesKeyboard((await getUser(cfg.MONGODB_URI, uid))?.categories || DEFAULT_CATEGORIES) }
    );

    setOnboardingState(uid, { step: "categories" });

    const kb = new InlineKeyboard().text("Yes", "onb:remind_yes").text("No", "onb:remind_no");
    await safeReply(ctx, "Do you want daily reminders?", { reply_markup: kb });
  });

  bot.callbackQuery("onb:remind_yes", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;
    await ctx.answerCallbackQuery();

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "Daily reminders need MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
      return;
    }

    setRemindState(uid, { step: "time" });
    await safeReply(ctx, "What time should I remind you? Reply with HH:MM (24h), for example 08:30");
  });

  bot.callbackQuery("onb:remind_no", async (ctx) => {
    await ctx.answerCallbackQuery();
    await safeReply(ctx, "No problem. You can set reminders later with /remind.\n\nTry /motivate or /tip anytime.");
  });

  bot.on("message:text", async (ctx, next) => {
    const uid = ctx.from?.id;
    const text = String(ctx.message?.text || "").trim();
    if (!uid) return next();
    if (text.startsWith("/")) return next();

    const rs = getRemindState(uid);
    if (!rs) return next();

    if (!cfg.MONGODB_URI) {
      clearRemindState(uid);
      return next();
    }

    if (rs.step === "time") {
      const parsed = parseTimeHHMM(text);
      if (!parsed) {
        await safeReply(ctx, "That doesn’t look like HH:MM. Example: 21:15");
        return;
      }
      setRemindState(uid, { step: "timezone", reminderTime: text });
      await safeReply(ctx, "What timezone are you in? Send an IANA name like Europe/London. Or reply 'UTC' to use UTC.");
      return;
    }

    if (rs.step === "timezone") {
      const tzRaw = text === "UTC" ? "UTC" : text;
      const tz = isValidIanaTimezone(tzRaw) ? tzRaw : "UTC";
      setRemindState(uid, { step: "type", reminderTime: rs.reminderTime, timezone: tz });

      const kb = new InlineKeyboard()
        .text("Motivation", "onb:type:Motivation")
        .text("Tip", "onb:type:Tip")
        .row()
        .text("Mixed", "onb:type:Mixed");

      await safeReply(ctx, `Reminder type? (Time: ${rs.reminderTime}, TZ: ${tz})`, { reply_markup: kb });
      return;
    }

    return next();
  });

  bot.callbackQuery(/^(onb:type:)/, async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;
    await ctx.answerCallbackQuery();

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "Reminders need MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
      return;
    }

    const data = String(ctx.callbackQuery?.data || "");
    const type = data.slice("onb:type:".length);

    const rs = getRemindState(uid);
    if (!rs?.reminderTime) {
      await safeReply(ctx, "Please run /remind to configure reminders.");
      return;
    }

    await updateUser(cfg.MONGODB_URI, uid, {
      remindersEnabled: true,
      reminderTime: rs.reminderTime,
      timezone: rs.timezone || "UTC",
      reminderType: type === "Motivation" || type === "Tip" || type === "Mixed" ? type : "Mixed",
      lastReminderSentOn: "",
    });

    clearRemindState(uid);
    clearOnboardingState(uid);

    await safeReply(ctx, "Done. You’ll get one reminder per day at that time. You can change it anytime with /remind, or stop with /remind_off.");
  });
}
