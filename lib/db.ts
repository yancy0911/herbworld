import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'leads.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_text TEXT NOT NULL,
      task TEXT,
      location TEXT,
      budget TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      source_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  const cols = _db.prepare("PRAGMA table_info(leads)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'source_url')) {
    _db.exec('ALTER TABLE leads ADD COLUMN source_url TEXT');
  }
  if (!cols.some(c => c.name === 'summary')) {
    _db.exec('ALTER TABLE leads ADD COLUMN summary TEXT');
  }
  if (!cols.some(c => c.name === 'is_cross_border')) {
    _db.exec('ALTER TABLE leads ADD COLUMN is_cross_border INTEGER NOT NULL DEFAULT 0');
  }
  return _db;
}

export interface Lead {
  id: number;
  raw_text: string;
  task: string | null;
  location: string | null;
  budget: string | null;
  summary: string | null;
  is_cross_border: number;   // 1 = 跨国需求（人在国内求助纽约）
  status: string;
  source_url: string | null;
  created_at: string;
}
