const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create tables if they don't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS paintings (
    id SERIAL PRIMARY KEY,
    title_he TEXT,
    title_en TEXT,
    technique_he TEXT,
    technique_en TEXT,
    year TEXT,
    size TEXT,
    category TEXT,
    filename TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS about (
    id INTEGER PRIMARY KEY DEFAULT 1,
    content_he TEXT DEFAULT '',
    content_en TEXT DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO about (id, content_he, content_en)
  VALUES (1, '', '')
  ON CONFLICT (id) DO NOTHING;

  CREATE TABLE IF NOT EXISTS autocomplete_titles (
    id SERIAL PRIMARY KEY,
    value TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS autocomplete_techniques (
    id SERIAL PRIMARY KEY,
    value TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS autocomplete_sizes (
    id SERIAL PRIMARY KEY,
    value TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => console.log('Database tables ready'))
  .catch(err => console.error('DB init error:', err));

// Wrapper to match SQLite-style API used in server.js
const db = {
  all: (sql, params, cb) => {
    pool.query(sql, params)
      .then(r => cb(null, r.rows))
      .catch(e => cb(e, []));
  },
  get: (sql, params, cb) => {
    pool.query(sql, params)
      .then(r => cb(null, r.rows[0] || null))
      .catch(e => cb(e, null));
  },
  run: (sql, params, cb) => {
    pool.query(sql, params)
      .then(r => { if (cb) cb(null); })
      .catch(e => { if (cb) cb(e); });
  }
};

module.exports = db;
