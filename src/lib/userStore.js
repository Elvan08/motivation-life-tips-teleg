import { ObjectId } from "mongodb";
import { getDb } from "./db.js";
import { safeErr } from "./safeErr.js";

export const DEFAULT_CATEGORIES = ["Motivation", "Habits", "Productivity"];

export function normalizeCategory(c) {
  return String(c || "").trim();
}

export function allowedCategories() {
  return [
    "Motivation",
    "Productivity",
    "Habits",
    "Mindset",
    "Confidence",
    "Relationships",
    "Health basics",
    "Study",
    "Finance basics",
    "Stress/Anxiety coping (non-clinical)",
    "Self-care",
  ];
}

export function parseTimeHHMM(s) {
  const t = String(s || "").trim();
  const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return { hh: Number(m[1]), mm: Number(m[2]) };
}

export function isValidIanaTimezone(tz) {
  const s = String(tz || "").trim();
  if (!s) return false;
  try {
    // Throws on invalid tz
    new Intl.DateTimeFormat("en-US", { timeZone: s }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function localNowParts(timeZone) {
  const tz = timeZone || "UTC";
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    yyyy: Number(get("year")),
    MM: Number(get("month")),
    dd: Number(get("day")),
    HH: Number(get("hour")),
    mm: Number(get("minute")),
    ss: Number(get("second")),
  };
}

export function localDateKey(timeZone) {
  const p = localNowParts(timeZone);
  const pad = (n) => String(n).padStart(2, "0");
  return `${p.yyyy}-${pad(p.MM)}-${pad(p.dd)}`;
}

export async function ensureIndexes(mongoUri) {
  const db = await getDb(mongoUri);
  if (!db) return;

  try {
    await db.collection("users").createIndex({ telegramUserId: 1 }, { unique: true });
    await db.collection("users").createIndex({ remindersEnabled: 1, reminderTime: 1 });
    await db.collection("favorites").createIndex({ telegramUserId: 1, createdAt: -1 });
    await db.collection("favorites").createIndex({ telegramUserId: 1, itemId: 1 }, { unique: true });
    await db.collection("history").createIndex({ telegramUserId: 1, createdAt: -1 });
  } catch (e) {
    console.error("[db] ensureIndexes failed", { err: safeErr(e) });
  }
}

export async function getUser(mongoUri, telegramUserId) {
  const db = await getDb(mongoUri);
  if (!db) {
    return {
      telegramUserId: String(telegramUserId),
      categories: DEFAULT_CATEGORIES,
      timezone: "UTC",
      remindersEnabled: false,
      reminderTime: "",
      reminderType: "Mixed",
      lastMood: "",
      lastMoodAt: null,
      lastItem: null,
    };
  }

  try {
    const u = await db.collection("users").findOne({ telegramUserId: String(telegramUserId) });
    if (!u) {
      await db.collection("users").updateOne(
        { telegramUserId: String(telegramUserId) },
        {
          $setOnInsert: {
            telegramUserId: String(telegramUserId),
            categories: DEFAULT_CATEGORIES,
            timezone: "UTC",
            reminderTime: "",
            reminderType: "Mixed",
            remindersEnabled: false,
            lastMood: "",
            lastMoodAt: null,
            lastItem: null,
            lastReminderSentOn: "",
            createdAt: new Date(),
          },
          $set: { updatedAt: new Date() },
        },
        { upsert: true }
      );
      return await db.collection("users").findOne({ telegramUserId: String(telegramUserId) });
    }
    return u;
  } catch (e) {
    console.error("[db] users findOne/upsert failed", { err: safeErr(e) });
    return {
      telegramUserId: String(telegramUserId),
      categories: DEFAULT_CATEGORIES,
      timezone: "UTC",
      remindersEnabled: false,
      reminderTime: "",
      reminderType: "Mixed",
      lastMood: "",
      lastMoodAt: null,
      lastItem: null,
    };
  }
}

export async function updateUser(mongoUri, telegramUserId, patch) {
  const db = await getDb(mongoUri);
  if (!db) return { ok: false };

  const mutable = { ...patch };
  delete mutable._id;
  delete mutable.createdAt;

  try {
    await db.collection("users").updateOne(
      { telegramUserId: String(telegramUserId) },
      {
        $setOnInsert: { },
        $set: { ...mutable, updatedAt: new Date() },
      },
      { upsert: true }
    );
    return { ok: true };
  } catch (e) {
    console.error("[db] users updateOne failed", { err: safeErr(e) });
    return { ok: false };
  }
}

export async function addFavorite(mongoUri, telegramUserId, item) {
  const db = await getDb(mongoUri);
  if (!db) return { ok: false, reason: "NO_DB" };

  try {
    await db.collection("favorites").updateOne(
      { telegramUserId: String(telegramUserId), itemId: String(item.itemId) },
      {
        $setOnInsert: {
          telegramUserId: String(telegramUserId),
          itemId: String(item.itemId),
          type: String(item.type || ""),
          text: String(item.text || ""),
          },
      },
      { upsert: true }
    );
    return { ok: true };
  } catch (e) {
    console.error("[db] favorites upsert failed", { err: safeErr(e) });
    return { ok: false };
  }
}

export async function removeFavorite(mongoUri, telegramUserId, itemId) {
  const db = await getDb(mongoUri);
  if (!db) return { ok: false, reason: "NO_DB" };

  try {
    await db.collection("favorites").deleteOne({ telegramUserId: String(telegramUserId), itemId: String(itemId) });
    return { ok: true };
  } catch (e) {
    console.error("[db] favorites deleteOne failed", { err: safeErr(e) });
    return { ok: false };
  }
}

export async function listFavorites(mongoUri, telegramUserId, { limit = 5, skip = 0 } = {}) {
  const db = await getDb(mongoUri);
  if (!db) return { ok: false, reason: "NO_DB", rows: [], total: 0 };

  try {
    const q = { telegramUserId: String(telegramUserId) };
    const total = await db.collection("favorites").countDocuments(q);
    const rows = await db
      .collection("favorites").find(q)
      .sort({ createdAt: -1 })
      .skip(Math.max(0, Number(skip || 0)))
      .limit(Math.max(1, Math.min(Number(limit || 5), 10)))
      .toArray();
    return { ok: true, rows, total };
  } catch (e) {
    console.error("[db] favorites find failed", { err: safeErr(e) });
    return { ok: false, rows: [], total: 0 };
  }
}

export async function addHistory(mongoUri, telegramUserId, item) {
  const db = await getDb(mongoUri);
  if (!db) return { ok: false, reason: "NO_DB" };

  try {
    await db.collection("history").insertOne({
      telegramUserId: String(telegramUserId),
      itemId: String(item.itemId),
      type: String(item.type || ""),
      text: String(item.text || ""),
      createdAt: new Date(),
    });

    // Keep only last 50 to limit DB growth per user
    const ids = await db
      .collection("history")
      .find({ telegramUserId: String(telegramUserId) }, { projection: { _id: 1 } })
      .sort({ createdAt: -1 })
      .skip(50)
      .limit(200)
      .toArray();

    if (ids.length) {
      await db.collection("history").deleteMany({ _id: { $in: ids.map((r) => new ObjectId(r._id)) } });
    }

    return { ok: true };
  } catch (e) {
    console.error("[db] history insertOne/trim failed", { err: safeErr(e) });
    return { ok: false };
  }
}

export async function listHistory(mongoUri, telegramUserId, { limit = 10 } = {}) {
  const db = await getDb(mongoUri);
  if (!db) return { ok: false, reason: "NO_DB", rows: [] };

  try {
    const rows = await db
      .collection("history")
      .find({ telegramUserId: String(telegramUserId) })
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(Number(limit || 10), 20)))
      .toArray();
    return { ok: true, rows };
  } catch (e) {
    console.error("[db] history find failed", { err: safeErr(e) });
    return { ok: false, rows: [] };
  }
}
