import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ODN Feedback Center",
  description: "反馈日志中心 - 接收、存储和可视化展示上下文日志数据",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background antialiased">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white text-sm font-bold">O</span>
              </div>
              <span className="text-base font-semibold text-foreground tracking-tight">
                ODN Feedback Center
              </span>
            </div>
            <div className="text-xs text-muted-foreground tracking-wider uppercase">
              Feedback Hub
            </div>
          </div>
        </header>
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
