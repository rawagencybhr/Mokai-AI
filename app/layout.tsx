
import React from 'react';
import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from '@/context/LanguageContext';

export const metadata: Metadata = {
  title: "RAWBOT - Smart Assistant Platform",
  description: "A smart, Khaleeji-dialect furniture sales assistant powered by Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
