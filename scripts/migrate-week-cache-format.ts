import "dotenv/config";

import Database from "better-sqlite3";

import { SQLITE_PATH } from "@/config";
import type { ComicDetails } from "@/types/locg";

const FORMAT_MAP: Record<string, string> = {
  Comic: "Print Comic",
  "Digital Chapter": "Digital Comic",
};

const db = new Database(SQLITE_PATH);

// Mirror the service's schema (src/services/weekCacheService.ts) so the
// script is safe on hosts where the table does not exist yet (no-op otherwise).
db.exec(`
  CREATE TABLE IF NOT EXISTS week_cache (
    publisher   TEXT NOT NULL,
    week        TEXT NOT NULL,
    comics      TEXT NOT NULL,
    degraded_ids TEXT NOT NULL DEFAULT '[]',
    fetched_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (publisher, week)
  );
`);

const rows = db
  .prepare("SELECT publisher, week, comics FROM week_cache")
  .all() as Array<{ publisher: string; week: string; comics: string }>;

const update = db.prepare(
  "UPDATE week_cache SET comics = ? WHERE publisher = ? AND week = ?",
);

let rewritten = 0;
for (const row of rows) {
  let comics: ComicDetails[];
  try {
    comics = JSON.parse(row.comics);
  } catch (error) {
    console.error(`SKIP corrupt row ${row.publisher}/${row.week}:`, error);
    continue;
  }
  let changed = false;
  for (const comic of comics) {
    const mapped = FORMAT_MAP[comic.format];
    if (mapped) {
      comic.format = mapped;
      changed = true;
    }
  }
  if (changed) {
    update.run(JSON.stringify(comics), row.publisher, row.week);
    rewritten++;
  }
}

console.log(
  `week_cache format migration: ${rows.length} rows, ${rewritten} rewritten`,
);
