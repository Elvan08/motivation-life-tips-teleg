import { safeReply } from "../lib/send.js";

export default function register(bot) {
  bot.command("help", async (ctx) => {
    const text = [
      "Commands:",
      "/start - Set up categories and optional reminders",
      "/motivate - Get a motivational message",
      "/tip - Get a practical life tip",
      "/mood - Set your mood",
      "/categories - Change categories",
      "/remind - Configure reminders",
      "/remind_off - Disable reminders",
      "/save - Save the last item",
      "/favorites - View saved items",
      "/history - View recent items",
      "/reset - Clear AI context memory",
      "",
      "Examples:",
      "1) /motivate",
      "2) /mood",
      "3) /remind (then send 08:30 and Europe/London)",
    ].join("\n");

    await safeReply(ctx, text);
  });
}
