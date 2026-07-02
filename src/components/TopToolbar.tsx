import React, { useRef } from "react";
import {
  Upload,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Split,
  GitCompare,
  Sparkles,
  HelpCircle,
  Search,
  Menu,
} from "lucide-react";
import { usePdfStore } from "../store/usePdfStore";
import { Button } from "./ui/Button";
import { loadPdfDocument } from "../utils/pdfEngine";

interface TopToolbarProps {
  onExport: () => void;
  onCompareClick: () => void;
  onOcrClick: () => void;
  onMergeClick: () => void;
  onSplitClick: () => void;
  onSecurityClick: () => void;
  onHelpClick: () => void;
  onSearchClick: () => void;
  onMobileToolsClick: () => void;
  onPrefetchWorkspace: () => void;
  onPrefetchOcr: () => void;
  onPrefetchCompare: () => void;
  onPrefetchPdfOps: () => void;
  onPrefetchSecurity: () => void;
  saveStatus: string;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  onExport,
  onCompareClick,
  onOcrClick,
  onMergeClick,
  onSplitClick,
  onSecurityClick,
  onHelpClick,
  onSearchClick,
  onMobileToolsClick,
  onPrefetchWorkspace,
  onPrefetchOcr,
  onPrefetchCompare,
  onPrefetchPdfOps,
  onPrefetchSecurity,
  saveStatus,
}) => {
  const {
    pdfFile,
    currentPage,
    numPages,
    zoom,
    undoStack,
    redoStack,
    isDarkMode,
    setPdfFile,
    setPdfDocument,
    setCurrentPage,
    setZoom,
    undo,
    redo,
    toggleDarkMode,
  } = usePdfStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      try {
        const doc = await loadPdfDocument(file);
        setPdfDocument(doc);
      } catch (err) {
        console.error("Error loading PDF document:", err);
        alert("Failed to load PDF. Please make sure it is a valid PDF file.");
      }
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleUploadIntent = () => {
    onPrefetchWorkspace();
  };

  return (
    <header className="h-14 border-b border-border bg-card text-card-foreground flex items-center justify-between px-4 z-20 shadow-sm select-none">
      {/* Left: Brand & File Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={triggerUpload} onMouseEnter={handleUploadIntent} onFocus={handleUploadIntent}>
          <div className="bg-primary p-1.5 rounded-md text-primary-foreground">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden md:inline-block bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            ProPDF Editor
          </span>
        </div>
        
        {pdfFile && (
          <div className="h-4 w-px bg-border hidden md:block" />
        )}

        {pdfFile ? (
          <div className="flex items-center gap-2 max-w-[240px] sm:max-w-[360px]">
            <div className="min-w-0">
              <span className="text-sm font-medium truncate block" title={pdfFile.name}>
                {pdfFile.name}
              </span>
              <span className="text-[11px] text-muted-foreground truncate block" title={saveStatus}>
                {saveStatus}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={triggerUpload} onMouseEnter={handleUploadIntent} onFocus={handleUploadIntent}>
              <Upload className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={triggerUpload}
            onMouseEnter={handleUploadIntent}
            onFocus={handleUploadIntent}
            className="flex items-center gap-2 shadow-md"
          >
            <Upload className="h-4 w-4" />
            Open PDF
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

      {/* Middle: Navigation & Zoom */}
      {pdfFile && (
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 text-sm px-2 font-medium">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setCurrentPage(val);
                }}
                min={1}
                max={numPages}
                className="w-10 text-center bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground">/ {numPages}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom(zoom - 0.1)}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom(zoom + 0.1)}
              disabled={zoom >= 4.0}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Right: Actions, Theme, Export */}
      <div className="flex items-center gap-2">
        {pdfFile && (
          <>
            {/* Undo / Redo */}
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={undo}
                disabled={undoStack.length === 0}
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={redo}
                disabled={redoStack.length === 0}
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Tools */}
            <div className="hidden lg:flex items-center gap-1 mr-2">
              <Button variant="ghost" size="sm" onClick={onOcrClick} onMouseEnter={onPrefetchOcr} onFocus={onPrefetchOcr} className="text-xs flex gap-1 items-center">
                OCR
              </Button>
              <Button variant="ghost" size="sm" onClick={onCompareClick} onMouseEnter={onPrefetchCompare} onFocus={onPrefetchCompare} className="text-xs flex gap-1 items-center">
                <GitCompare className="h-3.5 w-3.5" /> Compare
              </Button>
              <Button variant="ghost" size="sm" onClick={onMergeClick} onMouseEnter={onPrefetchPdfOps} onFocus={onPrefetchPdfOps} className="text-xs">
                Merge
              </Button>
              <Button variant="ghost" size="sm" onClick={onSplitClick} onMouseEnter={onPrefetchPdfOps} onFocus={onPrefetchPdfOps} className="text-xs">
                <Split className="h-3.5 w-3.5 mr-0.5" /> Split
              </Button>
              <Button variant="ghost" size="sm" onClick={onSecurityClick} onMouseEnter={onPrefetchSecurity} onFocus={onPrefetchSecurity} className="text-xs">
                Protect
              </Button>
            </div>
          </>
        )}

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={onSearchClick} className="h-9 w-9 rounded-lg" title="Find in document">
          <Search className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onMobileToolsClick} className="h-9 w-9 rounded-lg lg:hidden" title="Tools & Pages">
          <Menu className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-9 w-9 rounded-lg" title="Toggle theme">
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Help Button */}
        <Button variant="ghost" size="icon" onClick={onHelpClick} className="h-9 w-9 rounded-lg" title="Help & Keyboard Shortcuts">
          <HelpCircle className="h-4.5 w-4.5" />
        </Button>

        {pdfFile && (
          <Button
            variant="primary"
            size="sm"
            onClick={onExport}
            className="flex items-center gap-2 font-medium bg-green-600 hover:bg-green-500 text-white shadow-md border-0"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>
    </header>
  );
};
