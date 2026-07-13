import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import SwRegister from "@/components/sw-register";
import BottomNav from "@/components/bottom-nav";
import MainNav from "@/components/main-nav";
import LevelChip from "@/components/level-chip";
import { ThemeToggle } from "@/components/theme-toggle";
import AuthSync from "@/components/auth-sync";
import AuthGate from "@/components/auth-gate";

export const metadata: Metadata = {
  title: "Từ vựng tiếng Pháp",
  description:
    "Học từ vựng tiếng Pháp từ vỡ lòng (A1) đến nâng cao (C2) — nghĩa tiếng Việt, phát âm, ôn tập ngắt quãng.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Từ vựng Pháp", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fr.theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
        <header
          className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground shadow-sm">
                Fr
              </span>
              <span className="text-base font-bold tracking-tight">French</span>
            </Link>
            <div className="ml-2 hidden min-w-0 flex-1 md:block">
              <MainNav />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <LevelChip />
              <AuthSync />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">
          <AuthGate>{children}</AuthGate>
        </main>
        <BottomNav />
        <SwRegister />
      </body>
    </html>
  );
}
