import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import OrderNotifier from '@/components/OrderNotifier';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['500', '600', '700'],
});

export const metadata = {
  title: 'Nafilah POS',
  description: 'Aplikasi kasir, antrian, dan menu untuk kedai Nafilah',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sebelumnya zoom dimatikan total (userScalable: false) — itu praktik UX
  // yang buruk untuk aksesibilitas (pengguna dengan penglihatan terbatas
  // butuh bisa pinch-zoom). Sekarang zoom tetap diizinkan sampai 5x.
  maximumScale: 5,
  themeColor: '#064e3b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body
        className={`${sans.variable} ${mono.variable} font-sans bg-stone-100 lg:pl-20`}
      >
        <div className="max-w-md lg:max-w-4xl mx-auto min-h-screen bg-white relative pb-24 lg:pb-10 shadow-sm lg:shadow-elevated">
          <div className="flex items-center gap-3 px-5 pt-5 pb-6 lg:px-8 lg:pt-8 lg:pb-8 bg-gradient-to-br from-primary-900 to-stone-900 rounded-b-[32px]">
            <img src="/logo.png" alt="Nafilah" className="h-11 w-auto" />
            <span className="font-extrabold text-white text-lg tracking-wide">
              NAFILAH KITCHEN
            </span>
          </div>
          {children}
        </div>
        <OrderNotifier />
        <BottomNav />
      </body>
    </html>
  );
}
