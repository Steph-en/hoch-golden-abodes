import { useState, useEffect } from "react";
import {
  FileText, Download, ExternalLink, ZoomIn, ZoomOut,
  RotateCw, AlertTriangle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  url: string | null | undefined;
  fileName?: string | null;
  fileType?: string | null;
  emptyLabel?: string;
  minHeight?: number;
}

const AgreementDocumentViewer = ({
  url,
  fileName,
  fileType,
  emptyLabel = "No document attached",
  minHeight = 320,
}: Props) => {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isImage = !!(
    fileType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url ?? "")
  );
  const isPDF = !!(
    fileType === "application/pdf" || /\.pdf$/i.test(url ?? "")
  );

  useEffect(() => {
    setError(false);
    setZoom(1);
    setLoading(!!url && (isImage || isPDF));
  }, [url, fileType]);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ?? "agreement-document";
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  };

  /* ── Empty ── */
  if (!url) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground"
        style={{ minHeight }}
      >
        <FileText className="w-10 h-10 mb-3 opacity-25" />
        <p className="text-sm font-medium">{emptyLabel}</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5 text-muted-foreground gap-3"
        style={{ minHeight }}
      >
        <AlertTriangle className="w-8 h-8 text-destructive/50" />
        <p className="text-sm font-medium">Could not load document</p>
        <p className="text-xs text-center max-w-[220px]">
          The file may have expired or been removed.
        </p>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Download instead
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {fileName ?? (isPDF ? "PDF Document" : isImage ? "Image" : "Document")}
        </span>

        <div className="flex items-center gap-0.5">
          {isImage && (
            <>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                disabled={zoom >= 4}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setZoom(1)}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          <a href={url} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <div
        className="relative bg-muted/10 overflow-auto"
        style={{ minHeight }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {isImage && (
          <div className="flex items-start justify-center p-4" style={{ minHeight }}>
            <img
              src={url}
              alt={fileName ?? "Agreement document"}
              className="max-w-full rounded shadow-sm transition-transform duration-200 origin-top"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
          </div>
        )}

        {isPDF && (
          <iframe
            src={url}
            className="w-full rounded-b-xl"
            style={{ height: Math.max(minHeight, 480) }}
            title={fileName ?? "Agreement PDF"}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
        )}

        {!isImage && !isPDF && (
          <div
            className="flex flex-col items-center justify-center gap-3 text-center p-6"
            style={{ minHeight }}
          >
            <FileText className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">Preview not available</p>
            <p className="text-xs text-muted-foreground">
              This file type cannot be previewed in the browser.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download to view
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgreementDocumentViewer;