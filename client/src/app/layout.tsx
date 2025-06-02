// client/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Splatoon3 BAN/PICK Application", // ★ タイトル変更
  description: "Splatoon3 ban/pick application for private match", // 説明も変更 (任意)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-100`}> {/* ★ body に背景色追加 */}
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
        <header id="global-header" className="bg-gray-900 text-white shadow-md">
          <div className="container pl-3 py-3">
            <h1 className="text-xl font-bold">Splatoon3 BAN/PICK</h1>
          </div>
        </header>
        <main className="container mx-auto p-3"> {/* ★ main に変更し、padding調整 */}
          {children}
        </main>
      </body>
    </html>
  );
}