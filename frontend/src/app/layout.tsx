import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import AppLayout from '@/components/AppLayout';
import '@schedule-x/theme-default/dist/index.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Careformance Audio',
  description: 'Plateforme audio de préparation mentale sportive',
  icons: {
    icon: [{ url: '/logo.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
