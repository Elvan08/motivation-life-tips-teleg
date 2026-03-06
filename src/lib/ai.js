import { safeErr } from "./safeErr.js";

function trimSlash(u) {
  u = String(u || "");
  while (u.endsWith("/")) u = u.slice(0, -1);
  return u;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeReadJson(r) {
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { text, json };
}

function notConfigured(message) {
  return { ok: false, status: 412, json: null, text: "", error: message };
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, clear: () => clearTimeout(t) };
}

function pickTimeout(cfg) {
  const v = Number(cfg?.AI_TIMEOUT_MS || 600000);
  return Number.isFinite(v) && v > 0 ? v : 600000;
}

function pickModel(cfg, override) {
  const m = String(override || cfg?.AI_MODEL || "").trim();
  return m || undefined;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 504);
}

export function extractGatewayChatContent(json) {
  const content = json?.output?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  return "";
}

export async function aiChat(cfg, { messages, model, meta } = {}, opts = {}) {
  const base = trimSlash(cfg?.COOKMYBOTS_AI_ENDPOINT || "");
  const key = String(cfg?.COOKMYBOTS_AI_KEY || "");

  if (!base || !key) return notConfigured("AI_NOT_CONFIGURED (missing COOKMYBOTS_AI_ENDPOINT/COOKMYBOTS_AI_KEY)");

  const timeoutMs = Number(opts.timeoutMs || pickTimeout(cfg));
  const retries = Number.isFinite(opts.retries) ? Number(opts.retries) : Number(cfg?.AI_MAX_RETRIES || 2);

  const url = base + "/chat";

  console.log("[ai] chat start", {
    endpointSet: !!base,
    keySet: !!key,
    messages: Array.isArray(messages) ? messages.length : 0,
    model: model ? String(model) : "",
    meta: meta ? { platform: meta.platform || "", feature: meta.feature || "" } : {},
  });

  let attempt = 0;
  while (true) {
    attempt++;
    const { ctrl, clear } = withTimeout(timeoutMs);

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: Array.isArray(messages) ? messages : [],
          model: pickModel(cfg, model),
          meta: meta || undefined,
        }),
        signal: ctrl.signal,
      });

      const { text, json } = await safeReadJson(r);

      if (!r.ok) {
        const errMsg = json?.error || json?.message || text || "AI_ERROR";
        console.warn("[ai] chat fail", { status: r.status, attempt, err: String(errMsg).slice(0, 300) });

        if (attempt <= retries && isRetryableStatus(r.status)) {
          await sleep(750 * attempt);
          continue;
        }

        return { ok: false, status: r.status, json, text, error: String(errMsg) };
      }

      console.log("[ai] chat success", { status: r.status, attempt, hasOutput: !!json?.output });
      return { ok: true, status: r.status, json, text, error: null };
    } catch (e) {
      const msg = safeErr(e);
      const status = e?.name === "AbortError" ? 408 : 0;
      console.warn("[ai] chat exception", { status, attempt, err: String(msg).slice(0, 300) });

      if (attempt <= retries && (status === 0 || status === 408)) {
        await sleep(750 * attempt);
        continue;
      }

      return { ok: false, status, json: null, text: "", error: String(msg) };
    } finally {
      clear();
    }
  }
}
