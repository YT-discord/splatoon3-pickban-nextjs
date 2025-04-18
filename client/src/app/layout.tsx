// client/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast'; // ★ インポート

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BAN/PICK App", // タイトルは適宜変更
  description: "Real-time weapon ban/pick application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Toaster
          position="bottom-center" // 画面上部中央に表示
          gutter={8}
          toastOptions={{
            duration: 4000, // デフォルト表示時間 (4秒)
             style: {
               background: '#333', // 背景色 (ダーク)
               color: '#fff',     // 文字色 (白)
             },
             success: {
                 style: {
                     background: '#28a745', // 成功時 (緑)
                 },
             },
             error: {
                 style: {
                     background: '#dc3545', // エラー時 (赤)
                 },
             },
          }}
        />
        {children}
      </body>
    </html>
  );
}