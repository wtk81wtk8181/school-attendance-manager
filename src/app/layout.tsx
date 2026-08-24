import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const notoSansTc = Noto_Sans_TC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "萬鈞伯裘書院｜學生出勤與請假管理",
  description: "校務處與班主任使用的出勤、請假審核與缺席預警平台。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${notoSansTc.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
