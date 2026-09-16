'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { Lock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.staffLogin(pin);
      const next = searchParams.get('next') || '/';
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err.message || 'PIN salah');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="PIN"
        className="w-full bg-stone-100 rounded-2xl px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      {error && <p className="text-red-500 text-xs font-semibold mt-3">{error}</p>}
      <button
        type="submit"
        disabled={submitting || pin.length === 0}
        className="w-full bg-primary-500 text-stone-900 rounded-2xl py-4 font-extrabold text-sm mt-5 disabled:opacity-60 btn-shine"
      >
        {submitting ? 'Memeriksa...' : 'Masuk'}
      </button>
    </form>
  );
}

export default function StaffLoginPage() {
  return (
    <div className="px-5 pt-16 pb-10 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center mb-5">
        <Lock size={24} className="text-primary-400" />
      </div>
      <h1 className="text-xl font-extrabold text-stone-900">Login Staff</h1>
      <p className="text-sm text-stone-400 mt-1 mb-8">
        Masukkan PIN untuk mengakses Kasir, Antrian, Menu, dan Laporan
      </p>

      <Suspense fallback={<div className="text-sm text-stone-400">Memuat...</div>}>
        <LoginForm />
      </Suspense>

      <a href="/pesan" className="text-xs text-stone-400 font-semibold mt-8">
        Bukan staff? Pesan di sini →
      </a>
    </div>
  );
}