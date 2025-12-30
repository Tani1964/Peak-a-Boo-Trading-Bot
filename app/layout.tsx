import { Providers } from '@/components/providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import Navigation from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Peak-a-Boo Trading Bot',
  description: 'Automated trading bot with RSI and MACD strategies',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50">
            <Navigation />
            <main className="max-w-6xl mx-auto mt-8 px-4 pb-12">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
