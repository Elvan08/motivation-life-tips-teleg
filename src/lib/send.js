import { safeErr } from "./safeErr.js";

export async function safeReply(ctx, text, extra) {
  try {
    return await ctx.reply(text, extra);
  } catch (e) {
    console.error("[send] reply failed", { err: safeErr(e) });
    try {
      return await ctx.reply(String(text || ""));
    } catch (e2) {
      console.error("[send] reply fallback failed", { err: safeErr(e2) });
      return null;
    }
  }
}

export async function safeSendMessage(api, chatId, text, extra) {
  try {
    return await api.sendMessage(chatId, text, extra);
  } catch (e) {
    console.error("[send] sendMessage failed", { err: safeErr(e), chatId: String(chatId) });
    try {
      return await api.sendMessage(chatId, String(text || ""));
    } catch (e2) {
      console.error("[send] sendMessage fallback failed", { err: safeErr(e2), chatId: String(chatId) });
      return null;
    }
  }
}
