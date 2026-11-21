import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchDialog } from "@/components/search/search-dialog";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineGate } from "@/components/pwa/offline-gate";

export const metadata: Metadata = {
  title: { default: "DevShelf — Read the best programming books, free", template: "%s · DevShelf" },
  description: "A library of free programming books with a focused reader. No account, no backend, no tracking.",
  applicationName: "DevShelf",
};

const themeScript = `try{var t=localStorage.getItem('devshelf-theme')||'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const manifestHref = base ? `${base}/manifest.webmanifest` : "/manifest.webmanifest";
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href={manifestHref} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <PreferencesProvider>
          <TooltipProvider delayDuration={300}>
            <SiteHeader />
            <main id="main-content">{children}</main>
            <SearchDialog />
            <OfflineGate />
          </TooltipProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
