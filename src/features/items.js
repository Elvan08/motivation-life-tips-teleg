import crypto from "node:crypto";

export function makeItemId() {
  return crypto.randomBytes(9).toString("hex");
}

export function snippet(s, max = 90) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

export function formatHistoryItem(row) {
  const when = row?.createdAt ? new Date(row.createdAt) : null;
  const ts = when ? when.toISOString().replace("T", " ").slice(0, 16) + "Z" : "";
  const sn = snippet(row?.text || "", 110);
  const type = String(row?.type || "item");
  return `${ts} [${type}] ${sn}`.trim();
}

export function extractCrisisSignal(text) {
  const t = String(text || "").toLowerCase();
  const signals = [
    "suicide",
    "kill myself",
    "end it",
    "self harm",
    "self-harm",
    "hurt myself",
    "want to die",
  ];
  return signals.some((s) => t.includes(s));
}

export function crisisResponse() {
  return [
    "I’m really sorry you’re feeling this way.",
    "If you might hurt yourself or you’re in immediate danger, please contact your local emergency services right now.",
    "If you can, reach out to someone you trust (a friend, family member, or someone nearby) and tell them what’s going on.",
    "If you want, tell me what’s happening in a few words, and I can offer a small, non-clinical grounding step too.",
  ].join("\n");
}
