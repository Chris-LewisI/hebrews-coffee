import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { initializeDatabase } from '@/lib/db';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "HeBrews Coffee - Order Management System",
  description: "Professional coffee ordering system for church festivals and events",
};

// Initialize database on app startup
initializeDatabase().catch(console.error);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
