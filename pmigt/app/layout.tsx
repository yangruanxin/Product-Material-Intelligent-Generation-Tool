import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// AuthProvider 组件
import AuthProvider from "@/components/ui/AuthProvider"; 
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "图灵 · 智能电商视觉生成助手",
  description: "图灵是一款融合AI创意与视觉设计的电商智能平台，专注于为商家生成高质感主图与氛围图，用科技重塑电商视觉生产力。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          {/* 渲染警告组件 */}
          <Toaster 
              position="top-right" // 右上角警告
              richColors 
          />
        </AuthProvider>
      </body>
    </html>
  );
}