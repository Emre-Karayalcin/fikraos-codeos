import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Presentation,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// ── Types ──────────────────────────────────────────────────────────────────
interface PitchDeckGeneration {
  id: string;
  projectId: string;
  taskId: string;
  status: string;
  template: string;
  theme: string;
  downloadUrl: string | null;
  createdAt: string;
  projectTitle?: string;
}

// ── Extract file ID from downloadUrl ───────────────────────────────────────
function extractFileId(downloadUrl: string): string | null {
  // downloadUrl = /uploads/pitch/pitch-1234567890-abcdefgh.pptx
  const filename = downloadUrl.split("/").pop(); // pitch-1234567890-abcdefgh.pptx
  if (!filename) return null;
  return filename.replace(".pptx", ""); // pitch-1234567890-abcdefgh
}

// ── Main viewer ────────────────────────────────────────────────────────────
export default function PitchViewer() {
  const params = useParams<{ id: string; slug: string }>();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspace();
  const currentWorkspaceSlug = params.slug || workspaceSlug;

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generationId = params.id;

  // Fetch the generation data
  const { data: generation, isError: generationError } = useQuery<PitchDeckGeneration>({
    queryKey: ["/api/my-pitch-decks", generationId],
    queryFn: async () => {
      const res = await fetch(`/api/my-pitch-decks/${generationId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pitch deck");
      return res.json();
    },
    enabled: !!generationId,
  });

  const fileId = generation?.downloadUrl ? extractFileId(generation.downloadUrl) : null;
  const pptxDownloadUrl = generation?.downloadUrl || "";
  const pdfApiUrl = fileId ? `/api/presentation/${fileId}/pdf` : null;

  // Load the PDF
  useEffect(() => {
    if (!pdfApiUrl) return;

    let cancelled = false;
    let localUrl: string | null = null;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(pdfApiUrl, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          // If conversion fails, fall back gracefully
          throw new Error(`PDF conversion returned ${res.status}. Try downloading the PPTX instead.`);
        }
        const blob = await res.blob();
        if (cancelled) return;
        localUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(localUrl);
        setLoading(false);
      } catch (err: any) {
        console.error("❌ PDF load failed:", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load presentation as PDF.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [pdfApiUrl]);

  // Calculate page count from iframe PDF after load
  const handleIframeLoad = () => {
    // iframe doesn't give page count easily; use a reasonable default
    if (numPages === 0) setNumPages(1);
  };

  const changePage = (offset: number) => {
    setPageNumber((prev) => {
      const next = prev + offset;
      return Math.max(1, Math.min(next, numPages || 1));
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") changePage(-1);
      if (e.key === "ArrowRight") changePage(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [numPages]);

  const deckTitle = generation?.projectTitle || "Pitch Deck";

  if (generationError) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-900 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-white text-lg">Pitch deck not found</p>
        <Button
          variant="outline"
          onClick={() => setLocation(`/w/${currentWorkspaceSlug}/pitch`)}
          className="text-white border-gray-600 hover:bg-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pitch
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={() => setLocation(`/w/${currentWorkspaceSlug}/pitch`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-primary" />
            <h1 className="text-base sm:text-lg font-semibold text-white truncate max-w-[200px] sm:max-w-sm">
              {deckTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download PPTX */}
          {pptxDownloadUrl && (
            <a href={pptxDownloadUrl} download>
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PPTX</span>
              </Button>
            </a>
          )}

          {/* Download PDF (if loaded) */}
          {pdfBlobUrl && (
            <a href={pdfBlobUrl} download={`${deckTitle}.pdf`}>
              <Button size="sm" variant="outline" className="gap-1.5 border-gray-600 text-gray-300 hover:bg-gray-700">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* ── Main body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Viewer area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
          {/* Loading */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Presentation className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Loading presentation…</p>
                <p className="text-gray-400 text-sm mt-1">Converting to PDF for display</p>
              </div>
            </div>
          )}

          {/* Error / fallback */}
          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
              <div className="w-16 h-16 rounded-full bg-orange-900/30 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
              <div className="text-center max-w-md">
                <p className="text-white font-semibold text-lg">PDF preview not available</p>
                <p className="text-gray-400 text-sm mt-2">{error}</p>
                <p className="text-gray-500 text-xs mt-3">
                  This is usually because Google Drive conversion is not configured on this server.
                </p>
              </div>
              {pptxDownloadUrl && (
                <a href={pptxDownloadUrl} download>
                  <Button className="gap-2">
                    <Download className="w-4 h-4" />
                    Download PPTX to view locally
                  </Button>
                </a>
              )}
            </div>
          )}

          {/* PDF iframe */}
          {!loading && !error && pdfBlobUrl && (
            <div className="flex-1 overflow-auto flex items-start justify-center p-4">
              <iframe
                ref={iframeRef}
                src={pdfBlobUrl}
                title="Presentation PDF"
                className="w-full h-full rounded-lg shadow-2xl"
                style={{ border: "none", minHeight: 600 }}
                onLoad={handleIframeLoad}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: page navigation ─────────────────────────────────── */}
      {!loading && !error && pdfBlobUrl && numPages > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-center gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-gray-400 text-sm">
            Page {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          <div className="h-4 w-px bg-gray-700 mx-2" />

          {/* Dot navigator */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(numPages, 10) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setPageNumber(page)}
                className={`h-2 rounded-full transition-all ${
                  page === pageNumber
                    ? "bg-primary w-5"
                    : "bg-gray-600 hover:bg-gray-500 w-2"
                }`}
              />
            ))}
            {numPages > 10 && (
              <span className="text-gray-500 text-xs px-1">+{numPages - 10}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
