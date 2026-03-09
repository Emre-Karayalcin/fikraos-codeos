import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ChevronLeft, Download, ZoomIn, ZoomOut, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

// (remove react-pdf import & worker hacks - we'll render PDF via iframe)

export default function PresentationViewer() {
  const params = useParams<{ fileId: string }>();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const fileId = params.fileId;

  if (!fileId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">{t('common.error')}</p>
      </div>
    );
  }

  // always fetch fresh, no cache
  const pdfApiUrl = `/api/presentation/${fileId}/pdf?ts=${Date.now()}`;
  const downloadUrl = `https://slidespeak-files.s3.us-east-2.amazonaws.com/${fileId}.pptx`;

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(pdfApiUrl, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        localUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(localUrl);
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Fetch PDF failed:', err);
        if (!cancelled) {
          setError(err?.message || 'Failed to load PDF');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('✅ PDF loaded successfully! Pages:', numPages);
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ Error loading PDF (react-pdf):', error);
    setError(error.message);
  };

  const changePage = (offset: number) => {
    setPageNumber(prev => {
      const next = prev + offset;
      return Math.max(1, Math.min(next, numPages));
    });
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handleDownload = () => window.open(downloadUrl, '_blank');
  const handleBack = () => window.history.back();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') changePage(-1);
      if (e.key === 'ArrowRight') changePage(1);
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-' || e.key === '_') handleZoomOut();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [numPages]);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-semibold text-white">{t('pitchOutline.generateTitle')}</h1>
        </div>
        <Button onClick={handleDownload} variant="default" size="sm" className="gap-2 bg-[#4588f5] hover:bg-[#12a594]">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">PPTX</span>
        </Button>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#4588f5] animate-spin" />
            <p className="text-gray-400 text-sm">{t('common.loading')}...</p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-400 mb-2">{t('common.error')}</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && pdfBlobUrl && (
          <div className="w-full h-full min-h-[400px]">
            <iframe
              src={pdfBlobUrl}
              title="Presentation PDF"
              className="w-full h-full"
              style={{ border: 'none', minHeight: 600 }}
            />
          </div>
        )}
      </div>

      {/* Page indicators */}
      {!loading && numPages > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex justify-center">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(numPages, 10) }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setPageNumber(page)} className={`w-2 h-2 rounded-full transition-all ${pageNumber === page ? 'bg-[#4588f5] w-6' : 'bg-gray-600 hover:bg-gray-500'}`} aria-label={`Go to page ${page}`} />
            ))}
            {numPages > 10 && <span className="text-gray-500 text-xs px-2">+{numPages - 10}</span>}
          </div>
        </div>
      )}
    </div>
  );
}