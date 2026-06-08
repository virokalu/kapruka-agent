// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kapruka Agent — AI Shopping Assistant',
  description: 'Shop Kapruka with the power of AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-full overflow-hidden">
        {children}
      </body>
    </html>
  );
}