import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchDialog } from "@/components/search/search-dialog";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "DevShelf — Your library for learning to code", template: "%s · DevShelf" },
  description: "Explore thousands of free programming books and technical resources from the EbookFoundation free-programming-books catalog.",
  applicationName: "DevShelf",
};

const themeScript = `try{var t=localStorage.getItem('devshelf-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen bg-background text-foreground">
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
