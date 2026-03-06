import { cfg } from "./config.js";

export function getAdminIds() {
  const raw = String(cfg.BOT_ADMINS || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => String(s));
}

export function isAdminUserId(userId) {
  if (!userId) return false;
  const admins = getAdminIds();
  if (!admins.length) return false;
  return admins.includes(String(userId));
}
