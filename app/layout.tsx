import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Fare Tessile Hub',
  description: 'Premium SaaS control center for performance marketing agencies.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
