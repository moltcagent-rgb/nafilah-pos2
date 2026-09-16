'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { api, POLL_INTERVAL } from '@/lib/apiClient';
import { STATUS } from '@/lib/statusConfig';

const SOUND_KEY = 'nafilah_pos_sound_enabled';

// Notifikasi global (bunyi + notifikasi browser) saat ada pesanan baru masuk.
// Dipasang di app/layout.js supaya jalan di halaman mana pun (Kasir, Antrian,
// Menu, Laporan) — baik di HP maupun PC. Bunyinya di-generate langsung lewat
// Web Audio API (tidak perlu file suara), dan berhenti/nyala tersimpan di
// localStorage supaya tidak perlu diaktifkan ulang tiap buka halaman.
export default function OrderNotifier() {
  const [enabled, setEnabled] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);
  const audioCtxRef = useRef(null);
  const knownIdsRef = useRef(null); // null = belum pernah load sama sekali
  const statusMapRef = useRef(new Map()); // id -> status terakhir yang tercatat
  const enabledRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(SOUND_KEY) === 'true';
    setEnabled(stored);
    enabledRef.current = stored;
  }, []);

  // Daftarkan service worker sekali di awal — wajib supaya notifikasi
  // benar-benar muncul di tray notifikasi Android (Chrome di Android tidak
  // mengizinkan `new Notification()` langsung tanpa service worker).
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Gagal mendaftarkan service worker:', err);
      });
    }
  }, []);

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function playSiren() {
    try {
      const ctx = ensureAudioContext();
      const now = ctx.currentTime;
      const duration = 3.2; // total durasi bunyi (detik)
      const low = 500; // Hz, nada rendah
      const high = 1100; // Hz, nada tinggi
      const cycles = 4; // jumlah naik-turun ("wee-oo wee-oo ...")
      const cycleDuration = duration / cycles;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      // envelope: fade in cepat, tahan, fade out di akhir
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.08);
      gain.gain.setValueAtTime(0.4, now + duration - 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // sapuan frekuensi naik-turun berulang, khas sirene
      osc.frequency.setValueAtTime(low, now);
      for (let i = 0; i < cycles; i++) {
        const cycleStart = now + i * cycleDuration;
        osc.frequency.linearRampToValueAtTime(high, cycleStart + cycleDuration / 2);
        osc.frequency.linearRampToValueAtTime(low, cycleStart + cycleDuration);
      }

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch (err) {
      console.error('Gagal memutar bunyi notifikasi:', err);
    }
  }

  // Bunyi khusus saat pesanan berubah status jadi "Siap Diambil" — bel/lonceng
  // melodi naik-turun (bukan sapuan sirene), tapi tetap agak panjang biar
  // kedengaran jelas.
  function playReadyChime() {
    try {
      const ctx = ensureAudioContext();
      const now = ctx.currentTime;
      const up = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
      const sequence = [...up, ...up.slice().reverse()]; // naik lalu turun lagi
      const noteGap = 0.22;
      const noteDuration = 0.9;

      sequence.forEach((freq, i) => {
        const start = now + i * noteGap;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle'; // lebih lembut & "berdenting" dibanding sine polos
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.3, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + noteDuration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + noteDuration + 0.05);
      });
    } catch (err) {
      console.error('Gagal memutar bunyi notifikasi:', err);
    }
  }

  // Menampilkan notifikasi lewat service worker (registration.showNotification)
  // kalau tersedia — ini yang membuatnya benar-benar muncul di tray notifikasi
  // HP Android. Kalau service worker belum siap (mis. di beberapa browser
  // desktop lama), jatuh balik ke `new Notification()` biasa.
  async function notify(title, options) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options);
          return;
        }
      }
      new Notification(title, options);
    } catch (err) {
      console.error('Gagal menampilkan notifikasi:', err);
    }
  }

  function showBrowserNotification(order) {
    notify('Pesanan baru masuk', {
      body: order.order_number ? `Nota #${order.order_number}` : 'Ada pesanan baru masuk',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `order-new-${order.id}`,
      vibrate: [200, 100, 200],
    });
  }

  function showReadyNotification(order) {
    notify('Pesanan siap diambil', {
      body: order.order_number ? `Nota #${order.order_number} sudah siap` : 'Ada pesanan yang siap diambil',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `order-ready-${order.id}`,
      vibrate: [200, 100, 200],
    });
  }

  function toggle() {
    if (enabled) {
      localStorage.setItem(SOUND_KEY, 'false');
      enabledRef.current = false;
      setEnabled(false);
      return;
    }
    // aktifkan dalam event klik langsung, supaya browser mengizinkan bunyi
    ensureAudioContext();
    playSiren();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    localStorage.setItem(SOUND_KEY, 'true');
    enabledRef.current = true;
    setEnabled(true);
    setJustEnabled(true);
    setTimeout(() => setJustEnabled(false), 2500);
  }

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const orders = await api.listOrders({ limit: 30 });
        if (!mounted) return;

        const currentIds = new Set(orders.map((o) => o.id));
        const currentStatusMap = new Map(orders.map((o) => [o.id, o.status]));

        if (knownIdsRef.current === null) {
          // load pertama kali: cuma catat, jangan bunyi (biar tidak nyanyi
          // buat pesanan lama yang sudah ada sebelum halaman dibuka)
          knownIdsRef.current = currentIds;
          statusMapRef.current = currentStatusMap;
          return;
        }

        const newOnes = orders.filter((o) => !knownIdsRef.current.has(o.id));
        const justReady = orders.filter(
          (o) => o.status === STATUS.SIAP && statusMapRef.current.get(o.id) !== STATUS.SIAP
        );

        knownIdsRef.current = currentIds;
        statusMapRef.current = currentStatusMap;

        if (enabledRef.current) {
          if (newOnes.length > 0) {
            playSiren();
            newOnes.forEach(showBrowserNotification);
          }
          if (justReady.length > 0) {
            playReadyChime();
            justReady.forEach(showReadyNotification);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed top-4 left-0 right-0 lg:left-20 z-50 pointer-events-none">
      <div className="max-w-md lg:max-w-4xl mx-auto px-4 lg:px-8 flex justify-end items-center gap-2">
        {justEnabled && (
          <span className="pointer-events-none text-[11px] font-bold text-white bg-stone-900 px-3 py-1.5 rounded-full shadow-md">
            Notifikasi suara aktif
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={enabled ? 'Matikan notifikasi suara' : 'Aktifkan notifikasi suara'}
          className={`pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
            enabled ? 'bg-primary-500 text-white' : 'bg-white text-stone-400'
          }`}
        >
          {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>
    </div>
  );
}
