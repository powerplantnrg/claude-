import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Holiday Planner - Plan Your Perfect Vacation',
  description: 'Collaborative vacation planning app with AI assistance',
  keywords: ['vacation planner', 'travel', 'itinerary', 'AI travel assistant'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
