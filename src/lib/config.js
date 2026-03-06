export const cfg = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,

  COOKMYBOTS_AI_ENDPOINT: process.env.COOKMYBOTS_AI_ENDPOINT || "",
  COOKMYBOTS_AI_KEY: process.env.COOKMYBOTS_AI_KEY || "",

  MONGODB_URI: process.env.MONGODB_URI || "",

  BOT_ADMINS: process.env.BOT_ADMINS || "",

  AI_DEBUG: String(process.env.AI_DEBUG || "0") === "1",
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS || 600000),
  AI_MAX_RETRIES: Number(process.env.AI_MAX_RETRIES || 2),
  CONCURRENCY: Number(process.env.CONCURRENCY || 20),
};
