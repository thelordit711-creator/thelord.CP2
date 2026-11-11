import '../../styles/globals.css';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { StoreProvider } from '../../providers/StoreProvider';
import { SocketProvider } from '../../providers/SocketProvider';
import { AppShell } from '../../components/layout/AppShell';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'THE LORD OF CRYPTO — Control Panel (C.P)',
  description: 'All-in-One Enterprise Workspace & Simple Financial ERP',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png'
  }
};

export const viewport = {
  themeColor: '#07090E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover'
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  const isRtl = locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=JetBrains+Mono:wght@400;500;600;700&family=Tajawal:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="bg-obsidian-primary text-gray-200 antialiased selection:bg-lord-gold selection:text-obsidian-primary">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StoreProvider>
            <SocketProvider>
              <AppShell>{children}</AppShell>
              <Toaster
                position={isRtl ? 'top-left' : 'top-right'}
                theme="dark"
                toastOptions={{
                  style: {
                    background: '#0F141C',
                    border: '1px solid #D4AF37',
                    color: '#FFF'
                  }
                }}
              />
            </SocketProvider>
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

