import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Manrope, Permanent_Marker } from 'next/font/google';
import './globals.css';

const display = Cormorant_Garamond({ subsets: ['latin', 'cyrillic'], weight: ['500', '600'], variable: '--font-display' });
const brush = Permanent_Marker({ subsets: ['latin'], weight: '400', variable: '--font-brush' });
const ui = Manrope({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'], variable: '--font-ui' });

export const metadata: Metadata = {
  title: 'NOMADVERSE — Discover the Soul of Mongolia',
  description: 'Монгол нүүдэлчин ахуйг амьд 3D ертөнцөөр судлах интерактив туршлага.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#14213d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${display.variable} ${ui.variable} ${brush.variable}`}>
      <body>{children}</body>
    </html>
  );
}
