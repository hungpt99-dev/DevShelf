import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchDialog } from "@/components/search/search-dialog";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "DevShelf — Read the best programming books, free", template: "%s · DevShelf" },
  description: "A library of free programming books with a focused reader. No account, no backend, no tracking.",
  applicationName: "DevShelf",
};

const themeScript = `try{var t=localStorage.getItem('devshelf-theme')||'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <PreferencesProvider>
          <TooltipProvider delayDuration={300}>
            <SiteHeader />
            <main id="main-content">{children}</main>
            <SearchDialog />
          </TooltipProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
