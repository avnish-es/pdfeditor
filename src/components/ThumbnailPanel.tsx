import React, { useEffect, useRef, useState } from "react";
import { Trash2, RotateCw, ArrowUp, ArrowDown } from "lucide-react";
import { usePdfStore } from "../store/usePdfStore";
import { renderPdfPage } from "../utils/pdfEngine";

interface ThumbnailItemProps {
  pageNum: number;
  pdfDoc: any;
  isActive: boolean;
  onClick: () => void;
  onDelete: (pageNum: number) => void;
  onRotate: (pageNum: number) => void;
  onMove: (pageNum: number, direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  pageNum,
  pdfDoc,
  isActive,
  onClick,
  onDelete,
  onRotate,
  onMove,
  isFirst,
  isLast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const renderThumbnail = async () => {
      if (!canvasRef.current || !pdfDoc) return;
      try {
        setLoading(true);
        // Render at a small scale for thumbnail
        await renderPdfPage(pdfDoc, pageNum, canvasRef.current, 0.15, 0);
        if (active) setLoading(false);
      } catch (err) {
        console.error(`Error rendering thumbnail for page ${pageNum}:`, err);
      }
    };

    renderThumbnail();

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNum]);

  return (
    <div
      className={`group relative flex flex-col items-center p-2 rounded-lg border transition-all select-none ${
        isActive
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
      }`}
    >
      {/* Thumbnail Canvas Container */}
      <div
        onClick={onClick}
        className="cursor-pointer relative flex items-center justify-center bg-white border border-border/50 rounded overflow-hidden min-h-[120px] w-28 shadow-sm"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/25">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <canvas ref={canvasRef} className="max-w-full max-h-full" />
      </div>

      {/* Page Number & Controls */}
      <div className="mt-1.5 flex items-center justify-between w-full px-1">
        <span className="text-[11px] font-semibold text-muted-foreground">
          Page {pageNum}
        </span>
        
        {/* Controls Overlay (visible on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 rounded border border-border shadow-sm px-0.5 py-0.2">
          <button
            onClick={() => onRotate(pageNum)}
            className="p-1 text-muted-foreground hover:text-blue-500 hover:bg-muted rounded"
            title="Rotate Page"
          >
            <RotateCw className="h-3 w-3" />
          </button>
          {!isFirst && (
            <button
              onClick={() => onMove(pageNum, "up")}
              className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded"
              title="Move Up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
          )}
          {!isLast && (
            <button
              onClick={() => onMove(pageNum, "down")}
              className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded"
              title="Move Down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => onDelete(pageNum)}
            className="p-1 text-muted-foreground hover:text-destructive hover:bg-muted rounded"
            title="Delete Page"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ThumbnailPanelProps {
  onDeletePage: (pageNum: number) => void;
  onRotatePage: (pageNum: number) => void;
  onMovePage: (pageNum: number, direction: "up" | "down") => void;
}

export const ThumbnailPanel: React.FC<ThumbnailPanelProps> = ({
  onDeletePage,
  onRotatePage,
  onMovePage,
}) => {
  const { pdfDocument, numPages, currentPage, setCurrentPage } = usePdfStore();

  if (!pdfDocument) return null;

  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="w-36 border-r border-border bg-card text-card-foreground flex flex-col h-full select-none">
      <div className="p-3 border-b border-border">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Thumbnails
        </h4>
      </div>
      
      {/* Scrollable Thumbnails */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 items-center">
        {pages.map((pageNum) => (
          <ThumbnailItem
            key={`${pageNum}-${numPages}`}
            pageNum={pageNum}
            pdfDoc={pdfDocument}
            isActive={currentPage === pageNum}
            onClick={() => setCurrentPage(pageNum)}
            onDelete={onDeletePage}
            onRotate={onRotatePage}
            onMove={onMovePage}
            isFirst={pageNum === 1}
            isLast={pageNum === numPages}
          />
        ))}
      </div>
    </div>
  );
};
