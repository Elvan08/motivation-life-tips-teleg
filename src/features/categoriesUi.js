import { InlineKeyboard } from "grammy";
import { allowedCategories } from "../lib/userStore.js";

export function buildCategoriesKeyboard(selected) {
  const sel = new Set((selected || []).map((s) => String(s)));
  const kb = new InlineKeyboard();

  for (const c of allowedCategories()) {
    const mark = sel.has(c) ? "✅ " : "☑️ ";
    kb.text(mark + c, "cat:toggle:" + encodeURIComponent(c));
    kb.row();
  }

  kb.row();
  kb.text("Done", "cat:done");
  return kb;
}
