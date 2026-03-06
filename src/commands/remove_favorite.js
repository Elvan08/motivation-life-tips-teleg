import { safeReply } from "../lib/send.js";

export default function register(bot) {
  bot.command("remove_favorite", async (ctx) => {
    await safeReply(ctx, "To remove a favorite, open /favorites and tap Remove on the item you want to delete.");
  });
}
