import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata() {
  const cookieStore = await cookies()
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en'

  if (lang === 'ar') {
    return {
      title: "BizNest - كل ما تحتاجه لتنمية عملك",
      description: "BizNest هو النظام المتكامل لإدارة أعمالك بكفاءة وسهولة.",
    }
  }

  return {
    title: "BizNest - Manage your business with ease",
    description: "The complete system to grow your business effectively.",
  }
}

import { cookies } from 'next/headers'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const lang = cookieStore.get('NEXT_LOCALE')?.value || 'en'
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={lang} dir={dir}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
