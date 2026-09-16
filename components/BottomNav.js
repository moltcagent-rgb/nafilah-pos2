'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingCart, ClipboardList, UtensilsCrossed, BarChart3 } from 'lucide-react';
import { api, POLL_INTERVAL } from '@/lib/apiClient';
import { ACTIVE_STATUSES } from '@/lib/statusConfig';

// Nav yang sama dipakai untuk 2 tampilan: bottom bar di HP (default),
// dan sidebar kiri di layar lebar (breakpoint lg ke atas) — pola navigasi
// standar aplikasi desktop, bukan sekadar bottom-nav HP yang di-stretch.
export default function BottomNav() {
  const pathname = usePathname();
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      try {
        const data = await api.listOrders({ statuses: ACTIVE_STATUSES });
        if (mounted) setActiveCount((data || []).length);
      } catch (err) {
        console.error(err);
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const items = [
    { href: '/', label: 'Kasir', icon: ShoppingCart },
    { href: '/antrian', label: 'Antrian', icon: ClipboardList, badge: activeCount },
    { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { href: '/laporan', label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <>
      {/* ---------- Bottom bar (HP & tablet, disembunyikan di layar lg+) ---------- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-md mx-auto grid grid-cols-4 px-2 pt-2.5 pb-3">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-1"
              >
                <div className="relative">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                      active ? 'bg-primary-500 scale-105' : 'bg-transparent scale-100'
                    }`}
                  >
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? 'text-white' : 'text-stone-400'}
                    />
                  </div>
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-ember-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-mono">
                      {badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-bold ${active ? 'text-stone-900' : 'text-stone-400'}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ---------- Sidebar (layar lg ke atas) ---------- */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-20 flex-col items-center bg-gradient-to-b from-primary-900 to-stone-900 py-6">
        <img src="/logo.png" alt="Nafilah" className="h-9 w-9 rounded-xl object-contain mb-8" />
        <div className="flex flex-col gap-3 flex-1">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className="relative flex flex-col items-center gap-1 group"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    active
                      ? 'bg-primary-500 shadow-lg shadow-primary-900/40'
                      : 'bg-white/5 group-hover:bg-white/10'
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className={active ? 'text-white' : 'text-white/50'}
                  />
                </div>
                {badge > 0 && (
                  <span className="absolute -top-1 right-1 bg-ember-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-mono">
                    {badge}
                  </span>
                )}
                <span
                  className={`text-[9px] font-bold tracking-wide ${active ? 'text-white' : 'text-white/40'}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
