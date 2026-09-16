// Pengganti lib/supabaseClient.js. Semua request dikirim ke API route
// Next.js sendiri (app/api/...), yang di server terhubung ke Turso
// (database SQLite di cloud, lewat HTTP). Tidak ada koneksi database
// langsung dari browser, dan tidak ada realtime bawaan seperti Supabase,
// jadi setiap halaman melakukan polling (refetch berkala) — lihat
// penggunaan `usePolling` di masing-masing halaman.

async function request(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request gagal (${res.status})`);
  }
  return body.data;
}

export const api = {
  listMenuItems: () => request('/api/menu'),
  createMenuItem: (payload) =>
    request('/api/menu', { method: 'POST', body: JSON.stringify(payload) }),
  updateMenuItem: (id, payload) =>
    request(`/api/menu/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteMenuItem: (id) => request(`/api/menu/${id}`, { method: 'DELETE' }),

  listOrders: (params = {}) => {
    const { statuses, ...rest } = params;
    const merged = statuses && statuses.length ? { ...rest, statuses: statuses.join(',') } : rest;
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== null)
    ).toString();
    return request(`/api/orders${qs ? `?${qs}` : ''}`);
  },
  createOrder: (payload) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  updateOrderStatus: (id, status) =>
    request(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// Polling interval dalam ms. Bisa dinaikkan kalau mau hemat request,
// atau diturunkan kalau mau sinkron antar HP/kasir lebih cepat terasa.
export const POLL_INTERVAL = 4000;
