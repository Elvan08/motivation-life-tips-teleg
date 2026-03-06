import { cfg } from "../lib/config.js";
import { safeReply } from "../lib/send.js";
import { updateUser } from "../lib/userStore.js";

export default function register(bot) {
  bot.command("remind_off", async (ctx) => {
    const uid = ctx.from?.id;
    if (!uid) return;

    if (!cfg.MONGODB_URI) {
      await safeReply(ctx, "Reminders need MongoDB (MONGODB_URI). Right now I’m running in stateless mode.");
      return;
    }

    await updateUser(cfg.MONGODB_URI, uid, { remindersEnabled: false });
    await safeReply(ctx, "Reminders disabled.");
  });
}
