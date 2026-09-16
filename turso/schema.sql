-- =========================================================
-- Nafilah POS — Skema Database Turso (libSQL / SQLite)
-- Cara pakai:
--   turso db shell nama-database-anda < turso/schema.sql
-- (lihat README.md bagian "Setup database Turso" untuk detail)
-- =========================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL DEFAULT 'Lainnya',
  is_available INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Counter untuk nomor nota harian (reset otomatis tiap hari, UTC).
-- Di-increment secara atomik oleh lib/db.js (fungsi createOrder) lewat
-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING, jadi aman dari race
-- condition walau ada beberapa kasir order bersamaan.
CREATE TABLE IF NOT EXISTS order_counters (
  order_date TEXT PRIMARY KEY,
  counter INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number INTEGER,
  customer_name TEXT,
  items TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'menunggu_pembayaran'
    CHECK (status IN ('menunggu_pembayaran', 'diproses', 'siap', 'selesai', 'dibatalkan')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at);

-- Contoh menu awal (boleh dihapus/diedit lewat halaman Menu di app).
-- randomblob(16) dipakai sekadar untuk bikin id unik acak.
INSERT INTO menu_items (id, name, price, category) VALUES
  (lower(hex(randomblob(16))), 'Nasi Goreng Spesial', 20000, 'Makanan'),
  (lower(hex(randomblob(16))), 'Mie Goreng', 18000, 'Makanan'),
  (lower(hex(randomblob(16))), 'Ayam Bakar', 25000, 'Makanan'),
  (lower(hex(randomblob(16))), 'Es Teh Manis', 5000, 'Minuman'),
  (lower(hex(randomblob(16))), 'Es Jeruk', 7000, 'Minuman'),
  (lower(hex(randomblob(16))), 'Kerupuk', 3000, 'Snack');
