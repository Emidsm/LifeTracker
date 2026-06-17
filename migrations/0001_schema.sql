CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  pin_hash TEXT NOT NULL DEFAULT '',
  freq_minutes INTEGER NOT NULL DEFAULT 90,
  awake_start TEXT NOT NULL DEFAULT '08:00',
  awake_end TEXT NOT NULL DEFAULT '23:00',
  pause_until TEXT,
  last_notified_at TEXT,
  last_activity_at TEXT
);

INSERT OR IGNORE INTO settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'Por investigar',
  notes TEXT,
  link TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  UNIQUE(opportunity_id, item_key)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
