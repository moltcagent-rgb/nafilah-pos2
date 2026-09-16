import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

// Koneksi ke database Turso lewat HTTP (bukan koneksi database mentah),
// jadi jalan di semua jaringan termasuk yang memblokir protokol MySQL/SQL
// biasa, dan cocok dipakai di lingkungan serverless seperti Vercel.
let client;

function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

function nowIso() {
  return new Date().toISOString();
}

function rowToMenuItem(row) {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    is_available: !!row.is_available,
    image_url: row.image_url || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToOrder(row) {
  return {
    id: row.id,
    order_number: row.order_number,
    customer_name: row.customer_name,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    total: Number(row.total),
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------
// Menu
// ---------------------------------------------------------

export async function listMenuItems() {
  const result = await getClient().execute(
    'SELECT * FROM menu_items ORDER BY category ASC, name ASC'
  );
  return result.rows.map(rowToMenuItem);
}

export async function createMenuItem({ name, price, category, is_available, image_url }) {
  const id = randomUUID();
  const timestamp = nowIso();
  const result = await getClient().execute({
    sql: `INSERT INTO menu_items (id, name, price, category, is_available, image_url, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [id, name, price, category, is_available ? 1 : 0, image_url || null, timestamp, timestamp],
  });
  return rowToMenuItem(result.rows[0]);
}

export async function updateMenuItem(id, fields) {
  const allowed = ['name', 'price', 'category', 'is_available', 'image_url'];
  const sets = [];
  const args = [];
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = ?`);
      args.push(key === 'is_available' ? (fields[key] ? 1 : 0) : fields[key]);
    }
  }
  if (sets.length === 0) return null;
  sets.push('updated_at = ?');
  args.push(nowIso());
  args.push(id);

  const result = await getClient().execute({
    sql: `UPDATE menu_items SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
    args,
  });
  return result.rows[0] ? rowToMenuItem(result.rows[0]) : null;
}

export async function deleteMenuItem(id) {
  await getClient().execute({ sql: 'DELETE FROM menu_items WHERE id = ?', args: [id] });
}

// ---------------------------------------------------------
// Orders
// ---------------------------------------------------------

export async function listOrders({ from, to, limit, statuses } = {}) {
  const clauses = [];
  const args = [];
  if (from) {
    clauses.push('created_at >= ?');
    args.push(from);
  }
  if (to) {
    clauses.push('created_at <= ?');
    args.push(to);
  }
  if (statuses && statuses.length) {
    clauses.push(`status IN (${statuses.map(() => '?').join(', ')})`);
    args.push(...statuses);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limitSql = limit ? `LIMIT ${Number(limit)}` : '';

  const result = await getClient().execute({
    sql: `SELECT * FROM orders ${where} ORDER BY created_at DESC ${limitSql}`,
    args,
  });
  return result.rows.map(rowToOrder);
}

// Membuat pesanan baru + nomor nota harian (reset tiap hari UTC).
// INSERT ... ON CONFLICT ... RETURNING itu satu statement atomik di
// SQLite/Turso, jadi aman dari race condition walau ada beberapa kasir
// order bersamaan — dibungkus transaksi supaya nomor nota tidak "terbakar"
// kalau insert pesanannya sendiri gagal.
export async function createOrder({ customer_name, items, total, status }) {
  const db = getClient();
  const tx = await db.transaction('write');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const counterResult = await tx.execute({
      sql: `INSERT INTO order_counters (order_date, counter) VALUES (?, 1)
            ON CONFLICT(order_date) DO UPDATE SET counter = counter + 1
            RETURNING counter`,
      args: [today],
    });
    const orderNumber = counterResult.rows[0].counter;

    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const insertResult = await tx.execute({
      sql: `INSERT INTO orders (id, order_number, customer_name, items, total, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        id,
        orderNumber,
        customer_name || null,
        JSON.stringify(items),
        total,
        status,
        timestamp,
        timestamp,
      ],
    });

    await tx.commit();
    return rowToOrder(insertResult.rows[0]);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function updateOrderStatus(id, status) {
  const result = await getClient().execute({
    sql: 'UPDATE orders SET status = ?, updated_at = ? WHERE id = ? RETURNING *',
    args: [status, nowIso(), id],
  });
  return result.rows[0] ? rowToOrder(result.rows[0]) : null;
}
