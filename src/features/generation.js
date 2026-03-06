import { aiChat, extractGatewayChatContent } from "../lib/ai.js";
import { buildBotProfile } from "../lib/botProfile.js";
import { safeErr } from "../lib/safeErr.js";

function joinCats(cats) {
  const arr = Array.isArray(cats) ? cats : [];
  const cleaned = arr.map((c) => String(c).trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : "(none)";
}

function moodLine(mood) {
  const m = String(mood || "").trim();
  if (!m) return "Mood: unknown";
  return "Mood: " + m;
}

export async function generateMotivation({ cfg, user, extraUserText = "" }) {
  const profile = buildBotProfile();
  const cats = joinCats(user?.categories);
  const mood = moodLine(user?.lastMood);

  const system = [
    profile,
    "",
    "You generate motivational messages and life tips.",
    "Output rules:",
    "1) Keep it concise: 2–5 sentences.",
    "2) Supportive and practical. No shame, no moralizing.",
    "3) Add an optional one-line actionable step prefixed with: Action: ",
    "4) No medical or legal advice.",
    "5) If the user text suggests self-harm/crisis, respond with a supportive crisis-safe message encouraging contacting local emergency services or a trusted person.",
  ].join("\n");

  const userPrompt = [
    "User preferences:",
    "Categories: " + cats,
    mood,
    extraUserText ? ("User context: " + String(extraUserText).slice(0, 800)) : "",
    "",
    "Write one motivational message tailored to the user.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await aiChat(
    cfg,
    {
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      meta: { platform: "telegram", feature: "motivate" },
    },
    { retries: Number(cfg?.AI_MAX_RETRIES || 2) }
  );

  if (!res.ok) {
    console.error("[motivate] ai failed", { err: res.error || safeErr(res) });
    return { ok: false, text: "I couldn’t generate something right now. Try again in a moment." };
  }

  const text = extractGatewayChatContent(res.json);
  if (!text) {
    return { ok: false, text: "I didn’t get a valid response back. Try again." };
  }

  return { ok: true, text };
}

export async function generateTip({ cfg, user, extraUserText = "" }) {
  const profile = buildBotProfile();
  const cats = joinCats(user?.categories);
  const mood = moodLine(user?.lastMood);

  const system = [
    profile,
    "",
    "You generate practical life tips.",
    "Output rules:",
    "1) Keep it concise. Short intro + 2–4 bullet steps.",
    "2) Use simple hyphen bullets.",
    "3) Non-preachy, realistic, kind.",
    "4) No medical or legal advice.",
    "5) If the user text suggests self-harm/crisis, respond with a supportive crisis-safe message encouraging contacting local emergency services or a trusted person.",
  ].join("\n");

  const userPrompt = [
    "User preferences:",
    "Categories: " + cats,
    mood,
    extraUserText ? ("User context: " + String(extraUserText).slice(0, 800)) : "",
    "",
    "Write one practical tip tailored to the user.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await aiChat(
    cfg,
    {
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      meta: { platform: "telegram", feature: "tip" },
    },
    { retries: Number(cfg?.AI_MAX_RETRIES || 2) }
  );

  if (!res.ok) {
    console.error("[tip] ai failed", { err: res.error || safeErr(res) });
    return { ok: false, text: "I couldn’t generate a tip right now. Try again in a moment." };
  }

  const text = extractGatewayChatContent(res.json);
  if (!text) {
    return { ok: false, text: "I didn’t get a valid response back. Try again." };
  }

  return { ok: true, text };
}
