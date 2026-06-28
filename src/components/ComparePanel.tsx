import React, { useRef, useState, useEffect } from "react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { usePdfStore } from "../store/usePdfStore";
import { loadPdfDocument, renderPdfPage } from "../utils/pdfEngine";
import { Upload, ChevronLeft, ChevronRight, Split, Layers } from "lucide-react";

interface ComparePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComparePanel: React.FC<ComparePanelProps> = ({ isOpen, onClose }) => {
  const { pdfFile, pdfDocument } = usePdfStore();
  
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [compareDoc, setCompareDoc] = useState<any | null>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [compareMode, setCompareMode] = useState<"side-by-side" | "overlay">("side-by-side");
  const [overlaySliderVal, setOverlaySliderVal] = useState<number>(50); // 0 to 100

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Canvases
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  
  const canvasAOverlayRef = useRef<HTMLCanvasElement>(null);
  const canvasBOverlayRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompareFile(file);
      try {
        const doc = await loadPdfDocument(file);
        setCompareDoc(doc);
        const minPages = Math.min(pdfDocument.numPages, doc.numPages);
        setNumPages(minPages);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error loading comparison PDF:", err);
        alert("Failed to load PDF. Please make sure it is a valid PDF file.");
      }
    }
  };

  // Render pages
  useEffect(() => {
    if (!isOpen || !pdfDocument || !compareDoc) return;

    const renderPages = async () => {
      // Side by Side mode canvases
      if (compareMode === "side-by-side") {
        if (canvasARef.current) {
          await renderPdfPage(pdfDocument, currentPage, canvasARef.current, 0.75, 0);
        }
        if (canvasBRef.current) {
          await renderPdfPage(compareDoc, currentPage, canvasBRef.current, 0.75, 0);
        }
      } 
      // Overlay mode canvases
      else if (compareMode === "overlay") {
        if (canvasAOverlayRef.current) {
          await renderPdfPage(pdfDocument, currentPage, canvasAOverlayRef.current, 0.85, 0);
        }
        if (canvasBOverlayRef.current) {
          await renderPdfPage(compareDoc, currentPage, canvasBOverlayRef.current, 0.85, 0);
        }
      }
    };

    renderPages();
  }, [isOpen, currentPage, compareMode, pdfDocument, compareDoc]);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Compare Two PDFs"
      maxWidth="5xl"
      footer={
        <div className="flex justify-between w-full items-center">
          {compareDoc && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold">
                Page {currentPage} of {numPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 min-h-[50vh]">
        {/* Top Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold">
              <span className="text-muted-foreground mr-1">Document A:</span>
              <span className="text-foreground font-medium truncate max-w-[150px] inline-block align-bottom">
                {pdfFile?.name}
              </span>
            </div>
            
            <div className="h-4 w-px bg-border" />
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Document B:</span>
              {compareFile ? (
                <span className="text-xs font-medium text-foreground truncate max-w-[150px] inline-block align-bottom">
                  {compareFile.name}
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={triggerUpload}
                  className="h-7 text-xs flex gap-1.5 items-center"
                >
                  <Upload className="h-3 w-3" />
                  Select PDF B
                </Button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
              />
            </div>
          </div>

          {compareDoc && (
            <div className="flex items-center gap-1.5 bg-muted/40 p-0.5 rounded-lg border border-border">
              <Button
                variant={compareMode === "side-by-side" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCompareMode("side-by-side")}
                className="h-8 text-xs flex gap-1 items-center"
              >
                <Split className="h-3.5 w-3.5" />
                Side-by-Side
              </Button>
              <Button
                variant={compareMode === "overlay" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCompareMode("overlay")}
                className="h-8 text-xs flex gap-1 items-center"
              >
                <Layers className="h-3.5 w-3.5" />
                Slider Overlay
              </Button>
            </div>
          )}
        </div>

        {/* Comparison Display Viewport */}
        {!compareDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-muted/10 border border-dashed border-border rounded-xl">
            <Upload className="h-12 w-12 text-muted-foreground/60 mb-3 stroke-[1.5] animate-bounce" />
            <h3 className="text-sm font-bold mb-1">Select a Second PDF to Compare</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Compare differences side-by-side or use the sliding overlay to highlight changes between two revisions.
            </p>
            <Button variant="primary" onClick={triggerUpload}>
              Upload Comparison PDF
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 rounded-xl overflow-hidden min-h-[400px]">
            {compareMode === "side-by-side" ? (
              /* Side-by-Side Mode */
              <div className="grid grid-cols-2 gap-8 w-full max-w-4xl h-full">
                {/* PDF A */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Document A (Original)
                  </span>
                  <div className="bg-white p-2 rounded-lg border border-border shadow-md max-h-[400px] overflow-hidden flex items-center justify-center">
                    <canvas ref={canvasARef} className="max-w-full max-h-[380px] object-contain" />
                  </div>
                </div>

                {/* PDF B */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Document B (Revised)
                  </span>
                  <div className="bg-white p-2 rounded-lg border border-border shadow-md max-h-[400px] overflow-hidden flex items-center justify-center">
                    <canvas ref={canvasBRef} className="max-w-full max-h-[380px] object-contain" />
                  </div>
                </div>
              </div>
            ) : (
              /* Overlay Mode (Swipe Slider) */
              <div className="flex flex-col items-center gap-4 w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Overlay Swipe (Drag Slider to Compare)
                </span>
                
                {/* Slider Container */}
                <div className="relative w-[340px] h-[450px] bg-white rounded-lg border border-border shadow-lg overflow-hidden select-none">
                  {/* Bottom Image (PDF A) */}
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <canvas ref={canvasAOverlayRef} className="max-w-full max-h-full object-contain" />
                  </div>

                  {/* Top Image (PDF B) - Clipped by width */}
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden bg-white flex items-center justify-center p-2 border-r-2 border-primary"
                    style={{ width: `${overlaySliderVal}%` }}
                  >
                    {/* Maintain a fixed width wrapper so the canvas doesn't squash */}
                    <div className="absolute w-[340px] h-[450px] top-0 left-0 flex items-center justify-center p-2">
                      <canvas ref={canvasBOverlayRef} className="max-w-full max-h-full object-contain" />
                    </div>
                  </div>
                </div>

                {/* Swipe Range Control */}
                <div className="w-full max-w-xs flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Doc A</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={overlaySliderVal}
                    onChange={(e) => setOverlaySliderVal(parseInt(e.target.value, 10))}
                    className="w-full accent-primary bg-secondary h-2 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Doc B</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
