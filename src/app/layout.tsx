import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { DataProvider } from '@/context/data-context';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PRIMA MONITORING",
  description: "Website Monitoring KBM Prima",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#fdfcfb] text-stone-900 min-h-screen antialiased selection:bg-emerald-100 selection:text-emerald-900`}>
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
