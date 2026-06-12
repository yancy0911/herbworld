import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HerbWorld Share | 曼哈顿邻里闲置互助",
  description: "免费发布和领取附近闲置物品，需要搬运、清洁或组装时可申请合作商家试点会员价。",
  verification: { google: "N-mX0lHcPjoeAQBgTcJA-xPbNcRjduutpRbIXhBF37w" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
