import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { SQLITE_PATH } from "@/config";
import type { ComicDetails } from "@/types/locg";

fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });

const db = new Database(SQLITE_PATH);
db.pragma("journal_mode = WAL");

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

export interface CachedWeek {
  comics: ComicDetails[];
  degradedIds: string[];
}

export function getWeek(publisher: string, week: string): CachedWeek | null {
  const row = db
    .prepare("SELECT comics, degraded_ids FROM week_cache WHERE publisher = ? AND week = ?")
    .get(publisher, week) as { comics: string; degraded_ids: string } | undefined;
  if (!row) return null;
  return {
    comics: JSON.parse(row.comics) as ComicDetails[],
    degradedIds: JSON.parse(row.degraded_ids) as string[],
  };
}

export function upsertWeek(publisher: string, week: string, comics: ComicDetails[]): void {
  const degraded = comics.filter((c) => c.synthesized === true).map((c) => String(c.id));
  db.prepare(
    `INSERT INTO week_cache (publisher, week, comics, degraded_ids, fetched_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT (publisher, week) DO UPDATE SET
       comics = excluded.comics,
       degraded_ids = excluded.degraded_ids,
       fetched_at = datetime('now')`
  ).run(publisher, week, JSON.stringify(comics), JSON.stringify(degraded));
}
