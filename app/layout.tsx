import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://yunanlyu.com"),
  title: "Yunan — Personal Workspace",
  description: "Yunan 的个人网站与横向职业旅程：产品策略、GTM、电商运营与 AI 协作。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Yunan — Personal Workspace",
    description: "沿着一条横向曲线，探索产品策略、GTM、电商运营、AI 协作与项目经历。",
    images: [{ url: "/og.png", width: 1734, height: 907, alt: "Yunan Personal Workspace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yunan — Personal Workspace",
    description: "沿着一条横向曲线，探索产品策略、GTM、电商运营、AI 协作与项目经历。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
