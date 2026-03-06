import { MongoClient } from "mongodb";
import { safeErr } from "./safeErr.js";

let _client = null;
let _db = null;
let _dbOk = false;

export function dbStatus() {
  return { connected: !!_dbOk };
}

export async function getDb(mongoUri) {
  if (!mongoUri) return null;
  if (_db) return _db;

  try {
    _client = new MongoClient(mongoUri, { maxPoolSize: 5, ignoreUndefined: true });
    await _client.connect();
    _db = _client.db();
    _dbOk = true;
    console.log("[db] connected", { ok: true });
    return _db;
  } catch (e) {
    _dbOk = false;
    console.error("[db] connect failed", { err: safeErr(e) });
    return null;
  }
}
