import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MYCLO - あなたのAIスタイリスト",
  description: "自分のクローゼットからAIがコーデを提案。着る、買う、すべてMYCLOで。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${noto.className} bg-stone-50 text-stone-800`}>
        <div className="max-w-md mx-auto min-h-screen relative">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
