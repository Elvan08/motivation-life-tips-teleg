import { safeErr } from "../lib/safeErr.js";
import { safeSendMessage } from "../lib/send.js";
import { getDb } from "../lib/db.js";
import { getUser, localDateKey } from "../lib/userStore.js";
import { generateMotivation, generateTip } from "./generation.js";
import { makeItemId } from "./items.js";
import { addHistory, updateUser } from "../lib/userStore.js";

let started = false;
let lastPollRunAt = 0;
let lastMemLogAt = 0;

export function remindersStats() {
  return { lastPollRunAt };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function startRemindersLoop({ bot, cfg }) {
  if (started) return;
  started = true;

  const intervalMs = 60_000;
  console.log("[reminders] loop started", { intervalMs, mongoSet: !!cfg.MONGODB_URI });

  (async () => {
    while (true) {
      const cycleStart = Date.now();
      lastPollRunAt = cycleStart;

      try {
        const now = Date.now();
        if (now - lastMemLogAt > 60_000) {
          lastMemLogAt = now;
          const m = process.memoryUsage();
          console.log("[mem]", {
            rssMB: Math.round(m.rss / 1e6),
            heapUsedMB: Math.round(m.heapUsed / 1e6),
          });
        }

        if (!cfg.MONGODB_URI) {
          console.log("[reminders] cycle", { ran: true, due: 0, reason: "NO_DB" });
          await sleep(Math.max(1, intervalMs - (Date.now() - cycleStart)));
          continue;
        }

        const db = await getDb(cfg.MONGODB_URI);
        if (!db) {
          console.log("[reminders] cycle", { ran: true, due: 0, reason: "DB_NOT_CONNECTED" });
          await sleep(Math.max(1, intervalMs - (Date.now() - cycleStart)));
          continue;
        }

        const users = await db
          .collection("users")
          .find({ remindersEnabled: true, reminderTime: { $type: "string", $ne: "" } })
          .project({ telegramUserId: 1, reminderTime: 1, timezone: 1, reminderType: 1, lastReminderSentOn: 1, categories: 1, lastMood: 1 })
          .limit(1000)
          .toArray();

        let due = 0;
        for (const u of users) {
          const userId = u.telegramUserId;
          const tz = String(u.timezone || "UTC");
          const sentOn = String(u.lastReminderSentOn || "");
          const todayKey = localDateKey(tz);

          if (sentOn === todayKey) continue;

          const t = String(u.reminderTime || "");
          const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
          if (!m) continue;

          const hh = Number(m[1]);
          const mm = Number(m[2]);

          // Compare current local time to scheduled minute
          const parts = (() => {
            try {
              const fmt = new Intl.DateTimeFormat("en-GB", {
                timeZone: tz,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              const p = fmt.formatToParts(new Date());
              const get = (type) => p.find((x) => x.type === type)?.value;
              return { HH: Number(get("hour")), mm: Number(get("minute")) };
            } catch {
              return { HH: -1, mm: -1 };
            }
          })();

          if (parts.HH !== hh || parts.mm !== mm) continue;

          due++;

          const fullUser = await getUser(cfg.MONGODB_URI, userId);
          const type = String(u.reminderType || "Mixed");

          let which = "motivate";
          if (type === "Motivation") which = "motivate";
          else if (type === "Tip") which = "tip";
          else which = Math.random() < 0.5 ? "motivate" : "tip";

          const result = which === "motivate"
            ? await generateMotivation({ cfg, user: fullUser })
            : await generateTip({ cfg, user: fullUser });

          if (result.ok) {
            const itemId = makeItemId();
            await safeSendMessage(bot.api, userId, result.text);
            await updateUser(cfg.MONGODB_URI, userId, {
              lastReminderSentOn: todayKey,
              lastItem: { itemId, type: which, text: result.text },
            });
            await addHistory(cfg.MONGODB_URI, userId, { itemId, type: which, text: result.text });
          } else {
            console.warn("[reminders] generate failed", { userId: String(userId), which, err: String(result.text || "") });
          }

          // small yield
          await sleep(25);
        }

        console.log("[reminders] cycle", { ran: true, users: users.length, due });
      } catch (e) {
        console.error("[reminders] cycle failed", { err: safeErr(e) });
      }

      const elapsed = Date.now() - cycleStart;
      const wait = Math.max(1, intervalMs - elapsed);
      await sleep(wait);
    }
  })().catch((e) => {
    console.error("[reminders] loop crashed", { err: safeErr(e) });
  });
}
