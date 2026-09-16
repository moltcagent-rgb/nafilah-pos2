'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, POLL_INTERVAL } from '@/lib/apiClient';
import { formatRupiah } from '@/lib/format';
import { resizeImageToDataUrl } from '@/lib/imageUtils';
import { Plus, Pencil, Trash2, X, ImagePlus, ImageOff } from 'lucide-react';
import Spinner from '@/components/Spinner';

const EMPTY_FORM = { id: null, name: '', price: '', category: '', is_available: true, image_url: null };

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listMenuItems();
      setItems(data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  const grouped = useMemo(() => {
    const g = {};
    items.forEach((it) => {
      const cat = it.category || 'Lainnya';
      if (!g[cat]) g[cat] = [];
      g[cat].push(it);
    });
    return g;
  }, [items]);

  const existingCategories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
    [items]
  );

  function openNew() {
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(item) {
    setForm({
      id: item.id,
      name: item.name,
      price: String(item.price),
      category: item.category || '',
      is_available: item.is_available,
      image_url: item.image_url || null,
    });
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // biar bisa pilih file yang sama lagi kalau perlu
    if (!file) return;
    setImageProcessing(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setForm((f) => ({ ...f, image_url: dataUrl }));
    } catch (err) {
      alert('Gagal memproses foto: ' + err.message);
    } finally {
      setImageProcessing(false);
    }
  }

  async function save() {
    if (!form.name.trim() || !form.price) {
      alert('Nama dan harga wajib diisi');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category.trim() || 'Lainnya',
      is_available: form.is_available,
      image_url: form.image_url || null,
    };

    try {
      if (form.id) {
        await api.updateMenuItem(form.id, payload);
      } else {
        await api.createMenuItem(payload);
      }
      setForm(null);
      load();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(item) {
    try {
      await api.updateMenuItem(item.id, { is_available: !item.is_available });
      load();
    } catch (err) {
      alert('Gagal memperbarui: ' + err.message);
    }
  }

  async function remove(item) {
    if (!confirm(`Hapus menu "${item.name}"?`)) return;
    try {
      await api.deleteMenuItem(item.id);
      load();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  }

  return (
    <div className="pb-8">
      <header className="px-5 lg:px-8 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Menu &amp; Harga</h1>
        <p className="text-sm text-stone-400 mt-0.5">Kelola menu yang dijual di kedai</p>
      </header>

      <main className="px-5 lg:px-8 pt-2 space-y-6">
        {loading && <Spinner label="Memuat menu..." />}
        {!loading && items.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-10">
            Belum ada menu. Tambahkan menu pertama Anda lewat tombol + di kanan bawah.
          </p>
        )}
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat}>
            <h2 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide mb-2.5">
              {cat}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {list.map((item, idx) => (
                <div
                  key={item.id}
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  className="bg-white rounded-3xl p-3.5 flex items-center gap-3 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 animate-fade-in-up"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageOff size={18} className="text-stone-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-stone-900 truncate">{item.name}</p>
                    <p className="text-sm text-stone-900 font-extrabold font-mono">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                  <label
                    className="relative inline-flex items-center cursor-pointer shrink-0"
                    title={item.is_available ? 'Tersedia' : 'Habis'}
                  >
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={item.is_available}
                      onChange={() => toggleAvailable(item)}
                    />
                    <span className="w-11 h-6 bg-stone-200 rounded-full peer-checked:bg-emerald-400 transition-colors duration-300 block" />
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 peer-checked:translate-x-5" />
                  </label>
                  <button
                    onClick={() => openEdit(item)}
                    className="w-9 h-9 flex items-center justify-center text-stone-500 bg-stone-100 rounded-xl"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(item)}
                    className="w-9 h-9 flex items-center justify-center text-red-500 bg-red-50 rounded-xl"
                    aria-label={`Hapus ${item.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <button
        onClick={openNew}
        className="fixed bottom-24 lg:bottom-8 right-5 lg:right-10 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-ticket z-40 active:scale-90 transition-transform btn-shine"
        aria-label="Tambah menu"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {form && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center lg:p-4">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setForm(null)} />
          <div className="relative w-full max-w-md lg:max-w-lg mx-auto bg-white rounded-t-[32px] lg:rounded-[32px] p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-xl text-stone-900">
                {form.id ? 'Edit Menu' : 'Tambah Menu'}
              </h2>
              <button
                onClick={() => setForm(null)}
                aria-label="Tutup"
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-500 mb-1.5 block">
                  Foto Menu (opsional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                    {form.image_url ? (
                      <img
                        src={form.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlus size={24} className="text-stone-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="inline-block">
                      <span className="inline-block bg-stone-100 text-stone-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-transform">
                        {imageProcessing
                          ? 'Memproses...'
                          : form.image_url
                            ? 'Ganti Foto'
                            : 'Pilih Foto'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={imageProcessing}
                        onChange={handleImageChange}
                      />
                    </label>
                    {form.image_url && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image_url: null })}
                        className="block text-xs font-bold text-red-500"
                      >
                        Hapus foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 mb-1.5 block">Nama Menu</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="Nasi Goreng Spesial"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 mb-1.5 block">Harga (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="20000"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 mb-1.5 block">Kategori</label>
                <input
                  type="text"
                  list="category-list"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="Makanan / Minuman / dll"
                />
                <datalist id="category-list">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <label className="flex items-center justify-between text-sm font-semibold text-stone-600 pt-1">
                <span>Tersedia dijual</span>
                <span className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.is_available}
                    onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                  />
                  <span className="w-12 h-7 bg-stone-200 rounded-full peer-checked:bg-emerald-400 transition-colors duration-300 block" />
                  <span className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 peer-checked:translate-x-5" />
                </span>
              </label>
            </div>

            <button
              onClick={save}
              disabled={saving || imageProcessing}
              className="w-full bg-primary-500 text-white rounded-2xl py-4 font-extrabold text-sm mt-6 disabled:opacity-60 btn-shine"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
