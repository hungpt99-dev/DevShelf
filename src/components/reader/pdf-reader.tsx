"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicPath } from "@/lib/utils";
import { Loader2, Maximize2, Minus, Plus } from "lucide-react";

interface PdfDocumentLike {
  numPages: number;
  getPage: (page: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number };
    render: (params: { canvas: HTMLCanvasElement; viewport: { width: number; height: number } }) => { cancel: () => void };
  }>;
}

export default function PdfReader({
  url, initialPage, onProgress,
}: {
  url: string;
  initialPage: number;
  onProgress: (page: number, total: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfDocumentLike | null>(null);
  const [page, setPage] = useState(Math.max(1, initialPage || 1));
  const [zoom, setZoom] = useState(1.15);
  const [error, setError] = useState<{ url: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("pdfjs-dist").then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = publicPath("/pdf/pdf.worker.min.mjs");
      const task = pdfjs.getDocument({
        url: publicPath(url),
        standardFontDataUrl: publicPath("/pdf/standard_fonts/"),
      });
      const document = await task.promise;
      if (cancelled) return;
      setPdf(document as unknown as PdfDocumentLike);
      setPage((current) => Math.min(Math.max(1, current), document.numPages));
    }).catch((reason: unknown) => {
      if (!cancelled) setError({ url, message: reason instanceof Error ? reason.message : "Could not open this PDF" });
    });
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    pdf.getPage(page).then((pdfPage) => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ratio = window.devicePixelRatio || 1;
      // pdf.js scales the backing store itself; pass `canvas` (v6 requirement), not just a 2D context.
      const viewport = pdfPage.getViewport({ scale: zoom * ratio });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
      canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
      renderTask = pdfPage.render({ canvas, viewport });
    }).catch(() => setError({ url, message: "Could not render this page" }));
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [pdf, page, zoom, url]);

  useEffect(() => {
    if (pdf) onProgress(page, pdf.numPages);
  }, [pdf, page, onProgress]);

  const fullscreen = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void element.requestFullscreen();
  }, []);

  if (error?.url === url) {
    return <div role="alert" className="mx-auto max-w-xl rounded-[16px] border border-destructive/50 p-6 text-center text-[13px] text-destructive">PDF error: {error.message}</div>;
  }

  return (
    <div ref={containerRef} className="flex min-h-[70vh] flex-col items-center gap-4 py-6">
      {!pdf && <div className="flex items-center gap-2 py-20 text-[13px] text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading PDF...</div>}
      {pdf && (
        <>
          <canvas ref={canvasRef} className="max-w-full rounded-[12px] border border-line" aria-label={`PDF page ${page}`} />
          <div className="sticky bottom-4 flex flex-wrap items-center justify-center gap-2 rounded-[12px] border border-line bg-card/95 p-2 backdrop-blur-xl">
            <Button size="icon" variant="ghost" className="hover:border hover:border-lime" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Previous page">←</Button>
            <span className="min-w-28 text-center text-[12px] tabular-nums">Page {page} / {pdf.numPages}</span>
            <Button size="icon" variant="ghost" className="hover:border hover:border-lime" onClick={() => setPage((value) => Math.min(pdf.numPages, value + 1))} disabled={page >= pdf.numPages} aria-label="Next page">→</Button>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <Button size="icon" variant="ghost" className="hover:border hover:border-lime" onClick={() => setZoom((value) => Math.max(0.6, +(value - 0.15).toFixed(2)))} aria-label="Zoom out"><Minus className="size-4" /></Button>
            <span className="w-12 text-center font-mono text-[10px] tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="ghost" className="hover:border hover:border-lime" onClick={() => setZoom((value) => Math.min(2.2, +(value + 0.15).toFixed(2)))} aria-label="Zoom in"><Plus className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="hover:border hover:border-lime" onClick={fullscreen} aria-label="Fullscreen PDF"><Maximize2 className="size-4" /></Button>
          </div>
        </>
      )}
    </div>
  );
}
