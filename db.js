const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'gallery.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS paintings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_he TEXT,
    title_en TEXT,
    technique_he TEXT,
    technique_en TEXT,
    year TEXT,
    size TEXT,
    category TEXT,
    filename TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS about (
    id INTEGER PRIMARY KEY DEFAULT 1,
    content_he TEXT DEFAULT '',
    content_en TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`INSERT OR IGNORE INTO about (id, content_he, content_en) VALUES (1, '', '')`);

  db.run(`CREATE TABLE IF NOT EXISTS autocomplete_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT UNIQUE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS autocomplete_techniques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT UNIQUE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS autocomplete_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;
