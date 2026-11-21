import type { Metadata } from "next";
import { SharedView } from "@/components/shared/shared-view";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Shared shelf", description: "A read-only shared DevShelf shelf." };

export default function SharedPage() {
  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><SharedView /></div>
      <SiteFooter />
    </>
  );
}
