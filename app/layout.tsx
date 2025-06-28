import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
  title: 'Elevia - OKR達成サポートツール',
  description: 'AIと一緒に、あなたのOKRを現実的な計画に変えましょう',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
