import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { isAdminUserId } from "../lib/admin.js";
import { dbStatus, getDb } from "../lib/db.js";
import { remindersStats } from "../features/remindersLoop.js";
import { safeErr } from "../lib/safeErr.js";

const startedAt = Date.now();

export default function register(bot) {
  bot.command("admin_status", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    if (!cfg.BOT_ADMINS) {
      await safeReply(ctx, "Admin commands are disabled because BOT_ADMINS is not set.");
      return;
    }

    if (!isAdminUserId(uid)) {
      await safeReply(ctx, "Not allowed.");
      return;
    }

    let remindersEnabledCount = 0;
    try {
      const db = await getDb(cfg.MONGODB_URI);
      if (db) remindersEnabledCount = await db.collection("users").countDocuments({ remindersEnabled: true });
    } catch (e) {
      console.error("[admin_status] count failed", { err: safeErr(e) });
    }

    const upSec = Math.floor((Date.now() - startedAt) / 1000);
    const dbOk = dbStatus().connected;
    const rs = remindersStats();

    const text = [
      "Diagnostics",
      `Uptime: ${upSec}s`,
      `DB connected: ${dbOk}`,
      `Reminders enabled count: ${remindersEnabledCount}`,
      `Last reminder poll run: ${rs.lastPollRunAt ? new Date(rs.lastPollRunAt).toISOString() : ""}`,
      "",
      "Env presence:",
      `TOKEN set: ${!!cfg.TELEGRAM_BOT_TOKEN}`,
      `AI endpoint set: ${!!cfg.COOKMYBOTS_AI_ENDPOINT}`,
      `AI key set: ${!!cfg.COOKMYBOTS_AI_KEY}`,
      `Mongo set: ${!!cfg.MONGODB_URI}`,
      `BOT_ADMINS set: ${!!cfg.BOT_ADMINS}`,
    ].join("\n");

    await safeReply(ctx, text);
  });
}
