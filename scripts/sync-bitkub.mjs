// Pulls matched BTC buy orders from your Bitkub account via the official
// v3 API and merges them into data/orders.json.
//
// Requires env vars: BITKUB_API_KEY, BITKUB_API_SECRET
// Requires Node.js 20+ (built-in fetch + crypto).

import { createHmac } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const API_KEY = process.env.BITKUB_API_KEY;
const API_SECRET = process.env.BITKUB_API_SECRET;
const SYMBOL = process.env.BITKUB_SYMBOL || "thb_btc";
const BASE_URL = "https://api.bitkub.com";
const DATA_PATH = new URL("../data/orders.json", import.meta.url);

if (!API_KEY || !API_SECRET) {
  console.error("Missing BITKUB_API_KEY / BITKUB_API_SECRET env vars.");
  process.exit(1);
}

function sign(timestamp, method, path, body) {
  const payload = `${timestamp}${method}${path}${body}`;
  return createHmac("sha256", API_SECRET).update(payload, "utf8").digest("hex");
}

async function bitkubGet(path, params) {
  const query = new URLSearchParams(params || {}).toString();
  const fullPath = query ? `${path}?${query}` : path;
  const timestamp = Date.now().toString();
  const signature = sign(timestamp, "GET", fullPath, "");
  const res = await fetch(BASE_URL + fullPath, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-BTK-APIKEY": API_KEY,
      "X-BTK-TIMESTAMP": timestamp,
      "X-BTK-SIGN": signature,
    },
  });
  const json = await res.json();
  if (json.error && json.error !== 0) {
    throw new Error(`Bitkub API error ${json.error} on ${fullPath}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function fetchAllOrderHistory() {
  let page = 1;
  const all = [];
  while (true) {
    const res = await bitkubGet("/api/v3/market/my-order-history", {
      sym: SYMBOL,
      p: page,
      lmt: 100,
    });
    const rows = res.result || [];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 100) break;
    page += 1;
    if (page > 50) break;
  }
  return all;
}

async function loadExisting() {
  try {
    const raw = await readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { symbol: SYMBOL, last_synced: null, entries: [] };
  }
}

function normalize(row) {
  const spent = row.credit ?? row.amount_thb ?? (row.rate && row.amount ? row.rate * row.amount : null);
  const btc = row.amount ?? row.receive ?? null;
  const price = row.rate ?? null;
  const ts = row.ts ? row.ts * 1000 : Date.now();
  const id = row.txn_id || row.order_id || row.hash || `${ts}-${price}-${btc}`;
  return {
    id: String(id),
    time: new Date(ts).toISOString(),
    price,
    btc,
    spent: spent ?? (price && btc ? price * btc : null),
    side: (row.side || "buy").toLowerCase(),
  };
}

async function main() {
  const rows = await fetchAllOrderHistory();
  const buys = rows.map(normalize).filter((r) => r.side === "buy");

  const existing = await loadExisting();
  const byId = new Map(existing.entries.map((e) => [e.id, e]));
  for (const b of buys) byId.set(b.id, b);

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(a.time) - new Date(b.time)
  );

  const out = {
    symbol: SYMBOL,
    last_synced: new Date().toISOString(),
    entries: merged,
  };

  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(out, null, 2));
  console.log(`Synced ${merged.length} buy orders (fetched ${rows.length} raw rows).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
