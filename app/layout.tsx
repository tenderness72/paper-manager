import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Paper Manager', description: '論文と PDF をローカルで管理' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
