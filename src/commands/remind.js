import { InlineKeyboard } from "grammy";
import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { updateUser, parseTimeHHMM, isValidIanaTimezone } from "../lib/userStore.js";
import { setRemindState, getRemindState, clearRemindState } from "../features/state.js";

export default function register(bot) {
  bot.command("remind", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "Reminders need MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
      return;
    }

    setRemindState(uid, { step: "time" });
    await safeReply(ctx, "What time should I remind you? Reply with HH:MM (24h), for example 08:30");
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
      await safeReply(ctx, "Timezone? Send an IANA name like Europe/London. Or reply 'UTC' to use UTC.");
      return;
    }

    if (rs.step === "timezone") {
      const tzRaw = text === "UTC" ? "UTC" : text;
      const tz = isValidIanaTimezone(tzRaw) ? tzRaw : "UTC";
      setRemindState(uid, { step: "type", reminderTime: rs.reminderTime, timezone: tz });

      const kb = new InlineKeyboard()
        .text("Motivation", "rem:type:Motivation")
        .text("Tip", "rem:type:Tip")
        .row()
        .text("Mixed", "rem:type:Mixed");

      await safeReply(ctx, `Reminder type? (Time: ${rs.reminderTime}, TZ: ${tz})`, { reply_markup: kb });
      return;
    }

    return next();
  });

  bot.callbackQuery(/^(rem:type:)/, async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;
    await ctx.answerCallbackQuery();

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "Reminders need MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
      return;
    }

    const data = String(ctx.callbackQuery?.data || "");
    const type = data.slice("rem:type:".length);

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
    await safeReply(ctx, "Reminders enabled. Use /remind_off to disable.");
  });
}
