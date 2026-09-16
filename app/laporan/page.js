'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { api, POLL_INTERVAL } from '@/lib/apiClient';
import { formatRupiah, formatClock, formatDateShort } from '@/lib/format';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from '@/lib/dateRange';
import { STATUS, STATUS_CONFIG } from '@/lib/statusConfig';
import { TrendingUp, ShoppingBag, Clock3, Ban, ListFilter, ChevronDown, Layers } from 'lucide-react';
import Spinner from '@/components/Spinner';

// Omset dihitung dari pesanan yang statusnya sudah lewat "menunggu bayar"
// (artinya sudah dikonfirmasi dibayar), dan bukan yang dibatalkan.
const PAID_STATUSES = [STATUS.DIPROSES, STATUS.SIAP, STATUS.SELESAI];

const PERIODS = [
  { key: 'hari', label: 'Hari Ini' },
  { key: 'minggu', label: 'Minggu Ini' },
  { key: 'bulan', label: 'Bulan Ini' },
  { key: 'custom', label: 'Kustom' },
];

const TOP_ITEM_SORTS = [
  { key: 'omset', label: 'Omset Tertinggi' },
  { key: 'jumlah', label: 'Jumlah Terjual' },
  { key: 'nama', label: 'Nama A-Z' },
];

const TRANSACTION_SORTS = [
  { key: 'tanggal_desc', label: 'Tanggal Terbaru', by: 'tanggal', dir: -1 },
  { key: 'tanggal_asc', label: 'Tanggal Terlama', by: 'tanggal', dir: 1 },
  { key: 'pengorder_asc', label: 'Pengorder A-Z', by: 'pengorder', dir: 1 },
  { key: 'item_asc', label: 'Item A-Z', by: 'item', dir: 1 },
  { key: 'jumlah_desc', label: 'Jumlah Terbanyak', by: 'jumlah', dir: -1 },
  { key: 'total_desc', label: 'Total Terbesar', by: 'total', dir: -1 },
];

const PAGE_SIZE = 50;
const CHART_GREEN = '#10b981';

function toInputDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-stone-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg">
      <p className="font-bold mb-0.5">{label}</p>
      <p className="font-mono text-primary-300">{formatRupiah(payload[0].value)}</p>
    </div>
  );
}

export default function LaporanPage() {
  const [period, setPeriod] = useState('hari');
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date()));
  const [customTo, setCustomTo] = useState(toInputDate(new Date()));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topItemSort, setTopItemSort] = useState('omset');
  const [transactionSort, setTransactionSort] = useState('tanggal_desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'hari') return { start: startOfDay(now), end: endOfDay(now) };
    if (period === 'minggu') return { start: startOfWeek(now), end: endOfDay(now) };
    if (period === 'bulan') return { start: startOfMonth(now), end: endOfDay(now) };
    const start = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now);
    const end = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
    return { start, end };
  }, [period, customFrom, customTo]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setVisibleCount(PAGE_SIZE);

    async function load() {
      try {
        const data = await api.listOrders({
          from: range.start.toISOString(),
          to: range.end.toISOString(),
        });
        if (mounted) setOrders(data || []);
      } catch (err) {
        console.error(err);
      }
      if (mounted) setLoading(false);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [range]);

  const paidOrders = useMemo(
    () => orders.filter((o) => PAID_STATUSES.includes(o.status)),
    [orders]
  );
  const cancelledCount = useMemo(
    () => orders.filter((o) => o.status === STATUS.BATAL).length,
    [orders]
  );
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === STATUS.MENUNGGU).length,
    [orders]
  );
  const totalItemTerjual = useMemo(
    () => paidOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, it) => s + it.qty, 0), 0),
    [paidOrders]
  );

  const totalOmset = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalPesanan = paidOrders.length;
  const rataRata = totalPesanan > 0 ? Math.round(totalOmset / totalPesanan) : 0;

  // ---------- Data grafik tren omset ----------
  // "Hari Ini" -> per jam. Periode lain -> per tanggal (zero-filled biar garis tetap kontinu).
  const trendData = useMemo(() => {
    if (period === 'hari') {
      const buckets = Array.from({ length: 24 }, (_, h) => ({
        label: `${String(h).padStart(2, '0')}`,
        omset: 0,
      }));
      paidOrders.forEach((o) => {
        const h = new Date(o.created_at).getHours();
        buckets[h].omset += o.total;
      });
      return buckets;
    }
    const map = new Map();
    const cursor = new Date(range.start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(range.end);
    while (cursor <= last) {
      const key = toInputDate(cursor);
      map.set(key, {
        label: cursor.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        omset: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    paidOrders.forEach((o) => {
      const key = toInputDate(new Date(o.created_at));
      if (map.has(key)) map.get(key).omset += o.total;
    });
    return Array.from(map.values());
  }, [paidOrders, period, range]);

  const tickInterval = Math.max(0, Math.ceil(trendData.length / 7) - 1);

  const topItemsBase = useMemo(() => {
    const map = new Map();
    paidOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const prev = map.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
        prev.qty += it.qty;
        prev.revenue += it.subtotal;
        map.set(it.name, prev);
      });
    });
    return Array.from(map.values());
  }, [paidOrders]);

  const topItems = useMemo(() => {
    const arr = [...topItemsBase];
    if (topItemSort === 'jumlah') return arr.sort((a, b) => b.qty - a.qty);
    if (topItemSort === 'nama') return arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr.sort((a, b) => b.revenue - a.revenue);
  }, [topItemsBase, topItemSort]);

  const top5ChartData = useMemo(
    () =>
      [...topItemsBase]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((it) => ({ ...it, shortName: it.name.length > 14 ? it.name.slice(0, 13) + '…' : it.name })),
    [topItemsBase]
  );

  // ---------- Detail Transaksi: pecah tiap pesanan jadi 1 baris per item ----------
  const transactionLines = useMemo(() => {
    const lines = [];
    orders.forEach((o) => {
      (o.items || []).forEach((it, idx) => {
        lines.push({
          key: `${o.id}-${idx}`,
          order_number: o.order_number,
          created_at: o.created_at,
          customer_name: o.customer_name || 'Tanpa nama',
          item_name: it.name,
          qty: it.qty,
          subtotal: it.subtotal,
          status: o.status,
        });
      });
    });
    return lines;
  }, [orders]);

  const sortedLines = useMemo(() => {
    const sortConfig = TRANSACTION_SORTS.find((s) => s.key === transactionSort) || TRANSACTION_SORTS[0];
    const arr = [...transactionLines];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortConfig.by === 'tanggal') cmp = new Date(a.created_at) - new Date(b.created_at);
      else if (sortConfig.by === 'pengorder') cmp = a.customer_name.localeCompare(b.customer_name);
      else if (sortConfig.by === 'item') cmp = a.item_name.localeCompare(b.item_name);
      else if (sortConfig.by === 'jumlah') cmp = a.qty - b.qty;
      else if (sortConfig.by === 'total') cmp = a.subtotal - b.subtotal;
      return cmp * sortConfig.dir;
    });
    return arr;
  }, [transactionLines, transactionSort]);

  const visibleLines = sortedLines.slice(0, visibleCount);

  return (
    <div className="pb-8">
      <header className="px-5 lg:px-8 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Laporan Penjualan</h1>
        <p className="text-sm text-stone-400 mt-0.5">Dashboard omset dan performa menu</p>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-bold transition-colors ${
                period === p.key
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex gap-2 mt-3">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 bg-stone-100 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 bg-stone-100 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        )}
      </header>

      <main className="px-5 lg:px-8 pt-2 space-y-5">
        {loading ? (
          <Spinner label="Memuat laporan..." />
        ) : (
          <>
            <div className="lg:grid lg:grid-cols-5 lg:gap-5 lg:items-start space-y-5 lg:space-y-0">
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-gradient-to-br from-primary-900 via-stone-900 to-stone-900 rounded-[28px] p-6 text-white relative overflow-hidden animate-fade-in-up">
                  <div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center mb-3">
                    <TrendingUp size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <p className="text-xs text-white/60 font-semibold mb-1">Total Omset</p>
                  <p className="text-4xl font-extrabold font-mono text-primary-300">
                    {formatRupiah(totalOmset)}
                  </p>
                  <div className="flex justify-between mt-4 text-xs text-white/80 font-semibold">
                    <span>{totalPesanan} pesanan</span>
                    <span>Rata-rata {formatRupiah(rataRata)}/pesanan</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
                      <Clock3 size={15} className="text-amber-600" />
                    </div>
                    <p className="text-lg font-extrabold text-stone-900 font-mono">{pendingCount}</p>
                    <p className="text-[10px] text-stone-400 font-semibold leading-tight">Menunggu Bayar</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center mb-2">
                      <Layers size={15} className="text-primary-600" />
                    </div>
                    <p className="text-lg font-extrabold text-stone-900 font-mono">{totalItemTerjual}</p>
                    <p className="text-[10px] text-stone-400 font-semibold leading-tight">Item Terjual</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50">
                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mb-2">
                      <Ban size={15} className="text-red-500" />
                    </div>
                    <p className="text-lg font-extrabold text-stone-900 font-mono">{cancelledCount}</p>
                    <p className="text-[10px] text-stone-400 font-semibold leading-tight">Dibatalkan</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 bg-white rounded-[28px] p-5 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 animate-fade-in-up">
                <h2 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide mb-3">
                  Tren Omset {period === 'hari' ? '(per Jam)' : '(per Tanggal)'}
                </h2>
                <div className="h-52 lg:h-64 -ml-2">
                  {trendData.every((d) => d.omset === 0) ? (
                    <div className="h-full flex items-center justify-center text-stone-300 text-sm">
                      Belum ada omset di periode ini
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="omsetFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#f5f5f4" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: '#a8a29e' }}
                          axisLine={{ stroke: '#e7e5e4' }}
                          tickLine={false}
                          interval={tickInterval}
                        />
                        <YAxis hide domain={[0, 'dataMax + 1']} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="omset"
                          stroke={CHART_GREEN}
                          strokeWidth={2.5}
                          fill="url(#omsetFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start space-y-5 lg:space-y-0">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide flex items-center gap-1.5">
                    <ShoppingBag size={13} /> Menu Terlaris
                  </h2>
                  <div className="relative">
                    <select
                      value={topItemSort}
                      onChange={(e) => setTopItemSort(e.target.value)}
                      className="appearance-none bg-stone-100 text-stone-600 text-[11px] font-bold pl-3 pr-7 py-1.5 rounded-full focus:outline-none"
                    >
                      {TOP_ITEM_SORTS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                  </div>
                </div>

                {topItems.length === 0 ? (
                  <p className="text-center text-stone-400 text-sm py-6 bg-white rounded-3xl border border-stone-50">
                    Belum ada penjualan di periode ini
                  </p>
                ) : (
                  <div className="bg-white rounded-[28px] p-5 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 space-y-4">
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={top5ChartData}
                          layout="vertical"
                          margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="shortName"
                            width={92}
                            tick={{ fontSize: 10, fill: '#78716c' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: '#f5f5f4' }}
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              return (
                                <div className="bg-stone-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg">
                                  <p className="font-bold mb-0.5">{payload[0].payload.name}</p>
                                  <p className="font-mono text-primary-300">
                                    {formatRupiah(payload[0].value)}
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="revenue" fill={CHART_GREEN} radius={[0, 8, 8, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2.5 pt-1 border-t border-stone-100">
                      {topItems.map((it, idx) => (
                        <div
                          key={it.name}
                          style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                          className="flex items-center gap-3 animate-fade-in-up"
                        >
                          <span className="w-7 h-7 rounded-xl bg-primary-50 flex items-center justify-center text-xs font-extrabold text-primary-700 font-mono shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-stone-900 truncate">{it.name}</p>
                            <p className="text-xs text-stone-400 font-medium">{it.qty} terjual</p>
                          </div>
                          <span className="text-sm font-extrabold text-stone-900 font-mono shrink-0">
                            {formatRupiah(it.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide flex items-center gap-1.5">
                    <ListFilter size={13} /> Detail Transaksi
                  </h2>
                  <div className="relative">
                    <select
                      value={transactionSort}
                      onChange={(e) => setTransactionSort(e.target.value)}
                      className="appearance-none bg-stone-100 text-stone-600 text-[11px] font-bold pl-3 pr-7 py-1.5 rounded-full focus:outline-none"
                    >
                      {TRANSACTION_SORTS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                  </div>
                </div>

                {sortedLines.length === 0 ? (
                  <p className="text-center text-stone-400 text-sm py-6 bg-white rounded-3xl border border-stone-50">
                    Belum ada transaksi di periode ini
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] text-stone-400 font-semibold mb-2.5">
                      {sortedLines.length} baris transaksi
                    </p>
                    <div className="space-y-2 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
                      {visibleLines.map((line, idx) => {
                        const config = STATUS_CONFIG[line.status];
                        return (
                          <div
                            key={line.key}
                            style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}
                            className="bg-white rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 animate-fade-in-up"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-extrabold font-mono text-stone-400">
                                  #{line.order_number}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.color}`}
                                >
                                  {config.shortLabel}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-stone-800 truncate">
                                {line.item_name}{' '}
                                <span className="text-stone-400 font-semibold">x{line.qty}</span>
                              </p>
                              <p className="text-xs text-stone-400 mt-0.5 truncate">
                                {line.customer_name} · {formatDateShort(line.created_at)},{' '}
                                {formatClock(line.created_at)}
                              </p>
                            </div>
                            <span className="text-sm font-extrabold text-stone-900 font-mono shrink-0">
                              {formatRupiah(line.subtotal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {visibleCount < sortedLines.length && (
                      <button
                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        className="w-full mt-3 py-3 rounded-2xl bg-stone-100 text-stone-600 text-xs font-bold"
                      >
                        Muat {Math.min(PAGE_SIZE, sortedLines.length - visibleCount)} transaksi lagi
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
