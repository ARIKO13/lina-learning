-- LINA.LEARNING — Cloudflare D1 Schema
-- Run this SQL in your D1 dashboard or via wrangler:
--   wrangler d1 execute lina-learning --file=./d1-schema.sql

CREATE TABLE IF NOT EXISTS User (
  id            TEXT PRIMARY KEY,
  googleId      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  image         TEXT,
  xp            INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  streak        INTEGER NOT NULL DEFAULT 0,
  lastActiveAt  TEXT,
  currentSeason INTEGER NOT NULL DEFAULT 1,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS DailyProgress (
  id               TEXT PRIMARY KEY,
  userId           TEXT NOT NULL,
  date             TEXT NOT NULL,
  topic            TEXT NOT NULL,
  score            INTEGER NOT NULL,
  xpEarned         INTEGER NOT NULL,
  questionsCount   INTEGER NOT NULL,
  correctCount     INTEGER NOT NULL,
  timeSpentSeconds INTEGER NOT NULL,
  createdAt        TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT uq_daily_user_date UNIQUE (userId, date),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MonthlyRecap (
  id            TEXT PRIMARY KEY,
  userId        TEXT NOT NULL,
  yearMonth     TEXT NOT NULL,
  totalXP       INTEGER NOT NULL DEFAULT 0,
  totalDays     INTEGER NOT NULL DEFAULT 0,
  avgScore      REAL NOT NULL DEFAULT 0,
  bestScore     INTEGER NOT NULL DEFAULT 0,
  topicsCovered TEXT NOT NULL,
  level         INTEGER NOT NULL DEFAULT 0,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT uq_recap_user_month UNIQUE (userId, yearMonth),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS YearlyRecord (
  id         TEXT PRIMARY KEY,
  userId     TEXT NOT NULL,
  year       TEXT NOT NULL,
  season     INTEGER NOT NULL,
  totalXP    INTEGER NOT NULL DEFAULT 0,
  totalDays  INTEGER NOT NULL DEFAULT 0,
  avgScore   REAL NOT NULL DEFAULT 0,
  maxLevel   INTEGER NOT NULL DEFAULT 0,
  maxStreak  INTEGER NOT NULL DEFAULT 0,
  completed  INTEGER NOT NULL DEFAULT 0,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT uq_yearly_user_year_season UNIQUE (userId, year, season),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Certificate (
  id         TEXT PRIMARY KEY,
  userId     TEXT NOT NULL,
  season     INTEGER NOT NULL,
  year       TEXT NOT NULL,
  totalXP    INTEGER NOT NULL,
  totalDays  INTEGER NOT NULL,
  maxLevel   INTEGER NOT NULL,
  maxStreak  INTEGER NOT NULL,
  awardedAt  TEXT NOT NULL DEFAULT (datetime('now')),
  expiresAt  TEXT NOT NULL,
  shareCode  TEXT NOT NULL UNIQUE,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_daily_user_date ON DailyProgress(userId, date);
CREATE INDEX IF NOT EXISTS idx_recap_user ON MonthlyRecap(userId);
CREATE INDEX IF NOT EXISTS idx_yearly_user ON YearlyRecord(userId);
CREATE INDEX IF NOT EXISTS idx_cert_user ON Certificate(userId);
CREATE INDEX IF NOT EXISTS idx_cert_share ON Certificate(shareCode);
