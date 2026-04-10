import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HandyMan - Facility Management Platform',
  description: 'Moderne webapplicatie voor werkaanvragen, taken, projecten en aankoopbeheer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
