import { useState, useEffect } from "react";
import { fabric } from "fabric";
import { usePdfStore } from "./store/usePdfStore";
import { TopToolbar } from "./components/TopToolbar";
import { LeftSidebar } from "./components/LeftSidebar";
import { RightProperties } from "./components/RightProperties";
import { ThumbnailPanel } from "./components/ThumbnailPanel";
import { PdfCanvasViewer } from "./components/PdfCanvasViewer";
import { SignaturePad } from "./components/SignaturePad";
import { OcrPanel } from "./components/OcrPanel";
import { ComparePanel } from "./components/ComparePanel";
import { SecurityPanel } from "./components/SecurityPanel";
import { BatesDialog } from "./components/BatesDialog";
import { Dialog } from "./components/ui/Dialog";
import { Button } from "./components/ui/Button";
import {
  deletePages,
  insertBlankPage,
  rotatePage,
  reorderPages,
  extractPages,
  overlayEditsOnPdf,
  encryptPdf,
  compressPdf,
  mergePdfs,
  splitPdf,
  applyBatesNumbering,
} from "./utils/pdfOperations";
import { loadPdfDocument } from "./utils/pdfEngine";
import { Upload, FileText, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

export default function App() {
  const {
    pdfFile,
    pdfDocument,
    currentPage,
    numPages,
    canvasStates,
    zoom,
    setCurrentPage,
    setPdfFile,
    setPdfDocument,
    setZoom,
    setActiveTool,
    saveCanvasState,
    setSelectedObject,
    pushHistory,
    undo,
    redo,
  } = usePdfStore();

  // Active Fabric Canvas reference
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

  // Dialog open/close states
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isBatesOpen, setIsBatesOpen] = useState(false);

  // UX Feedback states
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Merge/Split state
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [splitRanges, setSplitRanges] = useState("");

  // Security/Export state
  const [exportPassword, setExportPassword] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  // Toast Helper
  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Sync dark mode class on mount
  useEffect(() => {
    const isDark = usePdfStore.getState().isDarkMode;
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Keyboard Shortcuts & Nudge Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.hasAttribute("contenteditable"))
      ) {
        return;
      }

      if (fabricCanvas && (fabricCanvas.getActiveObject() as any)?.isEditing) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (isCtrl && e.key === "z") {
        e.preventDefault();
        undo();
        showToast("Undo", "info");
      }
      // Redo: Ctrl+Y
      else if (isCtrl && e.key === "y") {
        e.preventDefault();
        redo();
        showToast("Redo", "info");
      }
      // Delete: Delete or Backspace
      else if (e.key === "Delete" || e.key === "Backspace") {
        const activeObj = fabricCanvas?.getActiveObject();
        if (activeObj) {
          e.preventDefault();
          fabricCanvas?.remove(activeObj);
          fabricCanvas?.discardActiveObject();
          fabricCanvas?.requestRenderAll();
          saveCanvasState(currentPage, fabricCanvas!.toJSON());
          pushHistory();
          setSelectedObject(null);
          showToast("Element removed", "info");
        }
      }
      // Zoom In: Ctrl + Plus
      else if (isCtrl && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setZoom(zoom + 0.1);
      }
      // Zoom Out: Ctrl + Minus
      else if (isCtrl && e.key === "-") {
        e.preventDefault();
        setZoom(zoom - 0.1);
      }
      // Escape: Clear selection & reset tool
      else if (e.key === "Escape") {
        e.preventDefault();
        fabricCanvas?.discardActiveObject();
        fabricCanvas?.requestRenderAll();
        setActiveTool("select");
      }
      // Nudge Element: Arrow keys
      else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const activeObj = fabricCanvas?.getActiveObject();
        if (activeObj) {
          e.preventDefault();
          const nudge = e.shiftKey ? 5 : 1;
          switch (e.key) {
            case "ArrowUp":
              activeObj.set("top", (activeObj.top || 0) - nudge);
              break;
            case "ArrowDown":
              activeObj.set("top", (activeObj.top || 0) + nudge);
              break;
            case "ArrowLeft":
              activeObj.set("left", (activeObj.left || 0) - nudge);
              break;
            case "ArrowRight":
              activeObj.set("left", (activeObj.left || 0) + nudge);
              break;
          }
          activeObj.setCoords();
          fabricCanvas?.requestRenderAll();
          saveCanvasState(currentPage, fabricCanvas!.toJSON());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fabricCanvas, currentPage, zoom, undo, redo, setZoom, saveCanvasState, pushHistory, setSelectedObject, setActiveTool]);

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      try {
        const doc = await loadPdfDocument(file);
        setPdfDocument(doc);
        showToast("PDF loaded successfully!", "success");
      } catch (err) {
        showToast("Failed to load PDF", "warning");
      }
    } else {
      showToast("Please drop a valid PDF file", "warning");
    }
  };

  // 1. Image Upload Handler
  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      fabric.Image.fromURL(imgUrl, (img) => {
        img.scaleToWidth(200);
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.requestRenderAll();
        
        pushHistory();
        saveCanvasState(currentPage, fabricCanvas.toJSON());
        showToast("Image added to page", "success");
      });
    };
    reader.readAsDataURL(file);
  };

  // 2. Page Management Handlers
  const handleInsertBlankPage = async () => {
    if (!pdfFile) return;
    try {
      const bytes = new Uint8Array(await pdfFile.arrayBuffer());
      const newBytes = await insertBlankPage(bytes, currentPage);
      const newFile = new File([newBytes as any], pdfFile.name, { type: "application/pdf" });
      setPdfFile(newFile);
      const doc = await loadPdfDocument(newFile);
      setPdfDocument(doc);
      showToast("Inserted blank page", "success");
    } catch (err) {
      console.error("Error inserting blank page:", err);
      showToast("Failed to insert page", "warning");
    }
  };

  const handleDeletePage = async (pageNum: number = currentPage) => {
    if (!pdfFile) return;
    if (numPages <= 1) {
      alert("Cannot delete the only page in the document.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete Page ${pageNum}?`)) {
      try {
        const bytes = new Uint8Array(await pdfFile.arrayBuffer());
        const newBytes = await deletePages(bytes, [pageNum - 1]);
        const newFile = new File([newBytes as any], pdfFile.name, { type: "application/pdf" });
        setPdfFile(newFile);
        const doc = await loadPdfDocument(newFile);
        setPdfDocument(doc);
        setCurrentPage(Math.min(currentPage, doc.numPages));
        showToast(`Page ${pageNum} deleted`, "success");
      } catch (err) {
        console.error("Error deleting page:", err);
        showToast("Failed to delete page", "warning");
      }
    }
  };

  const handleRotatePage = async (pageNum: number = currentPage) => {
    if (!pdfFile) return;
    try {
      const bytes = new Uint8Array(await pdfFile.arrayBuffer());
      const newBytes = await rotatePage(bytes, pageNum - 1, 90);
      const newFile = new File([newBytes as any], pdfFile.name, { type: "application/pdf" });
      setPdfFile(newFile);
      const doc = await loadPdfDocument(newFile);
      setPdfDocument(doc);
      showToast("Page rotated 90°", "success");
    } catch (err) {
      console.error("Error rotating page:", err);
      showToast("Failed to rotate page", "warning");
    }
  };

  const handleMovePage = async (pageNum: number, direction: "up" | "down") => {
    if (!pdfFile) return;
    const targetIndex = pageNum - 1;
    const newIndex = direction === "up" ? targetIndex - 1 : targetIndex + 1;
    if (newIndex < 0 || newIndex >= numPages) return;

    try {
      const order = Array.from({ length: numPages }, (_, i) => i);
      order[targetIndex] = newIndex;
      order[newIndex] = targetIndex;

      const bytes = new Uint8Array(await pdfFile.arrayBuffer());
      const newBytes = await reorderPages(bytes, order);
      const newFile = new File([newBytes as any], pdfFile.name, { type: "application/pdf" });
      setPdfFile(newFile);
      const doc = await loadPdfDocument(newFile);
      setPdfDocument(doc);
      setCurrentPage(newIndex + 1);
      showToast("Page reordered", "success");
    } catch (err) {
      console.error("Error reordering pages:", err);
      showToast("Failed to reorder page", "warning");
    }
  };

  const handleExtractPages = async () => {
    if (!pdfFile) return;
    try {
      const bytes = new Uint8Array(await pdfFile.arrayBuffer());
      const newBytes = await extractPages(bytes, [currentPage - 1]);
      const blob = new Blob([newBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `extracted_page_${currentPage}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Page extracted successfully", "success");
    } catch (err) {
      console.error("Error extracting page:", err);
      showToast("Failed to extract page", "warning");
    }
  };

  // 3. Signature Handler
  const handleSaveSignature = (signatureDataUrl: string) => {
    if (!fabricCanvas) return;
    fabric.Image.fromURL(signatureDataUrl, (img) => {
      img.scaleToWidth(150);
      const vCenter = fabricCanvas.getVpCenter();
      img.set({
        left: vCenter.x - 75,
        top: vCenter.y - 40,
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      
      pushHistory();
      saveCanvasState(currentPage, fabricCanvas.toJSON());
      showToast("Signature placed. Drag to position", "success");
    });
  };

  // 4. Merge PDF Handler
  const handleMergePdfs = async () => {
    if (mergeFiles.length < 2) {
      alert("Please upload at least 2 PDF files to merge.");
      return;
    }
    try {
      setIsExporting(true);
      setExportStatus("Merging PDF documents...");
      const mergedBytes = await mergePdfs(mergeFiles);
      const blob = new Blob([mergedBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "merged_document.pdf";
      link.click();
      URL.revokeObjectURL(url);
      setIsMergeOpen(false);
      setMergeFiles([]);
      showToast("PDFs merged successfully!", "success");
    } catch (err) {
      console.error("Merge error:", err);
      showToast("Failed to merge PDFs", "warning");
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  // 5. Split PDF Handler
  const handleSplitPdf = async () => {
    if (!pdfFile) return;
    if (!splitRanges.trim()) {
      alert("Please enter a valid page range (e.g., 1-2, 3-5).");
      return;
    }
    try {
      setIsExporting(true);
      setExportStatus("Splitting PDF document...");
      const fileBytes = new Uint8Array(await pdfFile.arrayBuffer());
      const results = await splitPdf(fileBytes, splitRanges);
      
      for (const result of results) {
        const blob = new Blob([result.bytes as any], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.name;
        link.click();
        URL.revokeObjectURL(url);
      }
      setIsSplitOpen(false);
      setSplitRanges("");
      showToast("PDF split successfully!", "success");
    } catch (err) {
      console.error("Split error:", err);
      showToast("Failed to split PDF", "warning");
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  // 6. Compress PDF Handler
  const handleCompressPdf = async () => {
    if (!pdfFile) return;
    try {
      setIsExporting(true);
      setExportStatus("Optimizing PDF structure...");
      const fileBytes = new Uint8Array(await pdfFile.arrayBuffer());
      const compressedBytes = await compressPdf(fileBytes);
      
      const blob = new Blob([compressedBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFile.name.replace(".pdf", "_compressed.pdf");
      link.click();
      URL.revokeObjectURL(url);
      showToast("PDF compressed successfully!", "success");
    } catch (err) {
      console.error("Compression error:", err);
      showToast("Failed to compress PDF", "warning");
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  // 6.5. Apply Bates Numbering Handler
  const handleApplyBates = async (options: {
    prefix: string;
    suffix: string;
    startNumber: number;
    paddingLength: number;
    position: "topLeft" | "topCenter" | "topRight" | "bottomLeft" | "bottomCenter" | "bottomRight";
    fontSize: number;
    color: string;
  }) => {
    if (!pdfFile) return;
    try {
      setIsExporting(true);
      setExportStatus("Applying Bates numbering...");
      const fileBytes = new Uint8Array(await pdfFile.arrayBuffer());
      const stampedBytes = await applyBatesNumbering(fileBytes, options);
      const newFile = new File([stampedBytes as any], pdfFile.name, { type: "application/pdf" });
      setPdfFile(newFile);
      const doc = await loadPdfDocument(newFile);
      setPdfDocument(doc);
      showToast("Bates numbering applied successfully!", "success");
    } catch (err) {
      console.error("Bates error:", err);
      showToast("Failed to apply Bates numbering", "warning");
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  // 7. Export / Flatten PDF Handler
  const handleExport = async () => {
    if (!pdfFile || !pdfDocument) return;

    try {
      setIsExporting(true);
      setExportStatus("Generating high-resolution annotations...");

      const pageEdits: { [page: number]: string } = {};
      const redactions: { [page: number]: { x: number; y: number; width: number; height: number }[] } = {};
      const formFields: { [page: number]: { type: "text" | "checkbox"; x: number; y: number; width: number; height: number }[] } = {};

      const tempCanvasEl = document.createElement("canvas");
      document.body.appendChild(tempCanvasEl);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const savedState = canvasStates[pageNum];

        if (savedState && savedState.objects) {
          const redactionObjs = savedState.objects.filter((obj: any) => obj.data?.type === "redaction");
          if (redactionObjs.length > 0) {
            redactions[pageNum] = redactionObjs.map((obj: any) => ({
              x: obj.left,
              y: obj.top,
              width: obj.width * (obj.scaleX || 1),
              height: obj.height * (obj.scaleY || 1),
            }));
          }
        }

        if (savedState && savedState.objects) {
          const formFieldObjs = savedState.objects.filter(
            (obj: any) => obj.data?.type === "form-text" || obj.data?.type === "form-checkbox"
          );
          if (formFieldObjs.length > 0) {
            formFields[pageNum] = formFieldObjs.map((obj: any) => ({
              type: obj.data.type === "form-text" ? "text" : "checkbox",
              x: obj.left,
              y: obj.top,
              width: obj.width * (obj.scaleX || 1),
              height: obj.height * (obj.scaleY || 1),
            }));
          }
        }

        const hasAnnotations =
          savedState &&
          savedState.objects &&
          savedState.objects.some(
            (obj: any) =>
              obj.data?.type !== "redaction" &&
              obj.data?.type !== "form-text" &&
              obj.data?.type !== "form-checkbox"
          );

        if (hasAnnotations) {
          setExportStatus(`Processing page ${pageNum} annotations...`);

          const page = await pdfDocument.getPage(pageNum);
          const originalRotation = page.rotate || 0;
          const viewport = page.getViewport({ scale: 1.0, rotation: originalRotation });

          tempCanvasEl.width = viewport.width;
          tempCanvasEl.height = viewport.height;

          const tempFCanvas = new fabric.Canvas(tempCanvasEl, {
            width: viewport.width,
            height: viewport.height,
          });

          const stateClone = JSON.parse(JSON.stringify(savedState));
          stateClone.objects = stateClone.objects.filter(
            (obj: any) =>
              obj.data?.type !== "redaction" &&
              obj.data?.type !== "form-text" &&
              obj.data?.type !== "form-checkbox"
          );

          await new Promise<void>((resolve) => {
            tempFCanvas.loadFromJSON(stateClone, () => {
              tempFCanvas.requestRenderAll();
              resolve();
            });
          });

          const pngDataUrl = tempFCanvas.toDataURL({
            format: "png",
            multiplier: 2,
          });

          pageEdits[pageNum] = pngDataUrl;
          tempFCanvas.dispose();
        }
      }

      document.body.removeChild(tempCanvasEl);

      setExportStatus("Compiling final PDF...");
      const originalBytes = new Uint8Array(await pdfFile.arrayBuffer());

      let finalBytes = await overlayEditsOnPdf(originalBytes, pageEdits, redactions, formFields);

      if (exportPassword) {
        setExportStatus("Encrypting PDF...");
        finalBytes = await encryptPdf(finalBytes, exportPassword, exportPassword);
      }

      finalBytes = await compressPdf(finalBytes);

      const blob = new Blob([finalBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFile.name.replace(".pdf", "_edited.pdf");
      link.click();
      URL.revokeObjectURL(url);

      showToast("PDF exported successfully!", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export PDF", "warning");
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden"
    >
      {/* 1. TOP TOOLBAR */}
      <TopToolbar
        onExport={handleExport}
        onCompareClick={() => setIsCompareOpen(true)}
        onOcrClick={() => setIsOcrOpen(true)}
        onMergeClick={() => setIsMergeOpen(true)}
        onSplitClick={() => setIsSplitOpen(true)}
        onSecurityClick={() => setIsSecurityOpen(true)}
        onHelpClick={() => setIsHelpOpen(true)}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar + Settings */}
        <LeftSidebar
          onAddImage={handleAddImage}
          onInsertBlankPage={handleInsertBlankPage}
          onDeletePage={() => handleDeletePage()}
          onRotatePage={() => handleRotatePage()}
          onExtractPages={handleExtractPages}
          onOpenSignatureDialog={() => setIsSignatureOpen(true)}
          onRunOcr={() => setIsOcrOpen(true)}
          onTriggerCompress={handleCompressPdf}
          onBatesClick={() => setIsBatesOpen(true)}
        />

        {/* Thumbnails Panel */}
        {pdfDocument && (
          <ThumbnailPanel
            onDeletePage={handleDeletePage}
            onRotatePage={handleRotatePage}
            onMovePage={handleMovePage}
          />
        )}

        {/* Central PDF Viewer Canvas */}
        <PdfCanvasViewer onCanvasInit={setFabricCanvas} />

        {/* Right Properties Inspector */}
        <RightProperties />
      </div>

      {/* 3. EXPORT / PROCESSING OVERLAY */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-sm font-semibold text-foreground text-center">{exportStatus}</span>
            <span className="text-xs text-muted-foreground mt-2">Do not close this tab</span>
          </div>
        </div>
      )}

      {/* 4. DRAG & DROP OVERLAY */}
      {isDraggingOver && (
        <div
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="fixed inset-0 bg-primary/20 backdrop-blur-md border-4 border-dashed border-primary z-50 flex flex-col items-center justify-center pointer-events-auto"
        >
          <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center max-w-sm shadow-2xl text-center">
            <Upload className="h-12 w-12 text-primary animate-bounce mb-4" />
            <h3 className="text-lg font-bold mb-2">Drop your PDF here</h3>
            <p className="text-sm text-muted-foreground">
              Release to instantly open and start editing your document.
            </p>
          </div>
        </div>
      )}

      {/* 5. DIALOGS & MODALS */}
      {/* Signature Pad */}
      <SignaturePad
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSaveSignature={handleSaveSignature}
      />

      {/* OCR Text Recognition */}
      <OcrPanel isOpen={isOcrOpen} onClose={() => setIsOcrOpen(false)} />

      {/* PDF Comparison */}
      <ComparePanel isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} />

      {/* Security & Watermarking */}
      <SecurityPanel
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        onApplyPassword={setExportPassword}
      />

      {/* Help & Keyboard Shortcuts Dialog */}
      <Dialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Help & Keyboard Shortcuts"
        maxWidth="lg"
      >
        <div className="space-y-5 select-none">
          <div>
            <h4 className="text-sm font-bold text-foreground mb-2">Keyboard Shortcuts</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between border-b border-border py-1.5">
                <span className="text-muted-foreground">Undo</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded shadow-xs font-mono">Ctrl + Z</kbd>
              </div>
              <div className="flex justify-between border-b border-border py-1.5">
                <span className="text-muted-foreground">Redo</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded shadow-xs font-mono">Ctrl + Y</kbd>
              </div>
              <div className="flex justify-between border-b border-border py-1.5">
                <span className="text-muted-foreground">Delete Element</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded shadow-xs font-mono">Delete / Backspace</kbd>
              </div>
              <div className="flex justify-between border-b border-border py-1.5">
                <span className="text-muted-foreground">Zoom In / Out</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded shadow-xs font-mono">Ctrl + +/-</kbd>
              </div>
              <div className="flex justify-between border-b border-border py-1.5">
                <span className="text-muted-foreground">Nudge Element</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded shadow-xs font-mono">Arrow Keys</kbd>
              </div>
              <div className="flex justify-between border-b border-border py-1.5">
                <span className="text-muted-foreground">Fast Nudge (5px)</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded shadow-xs font-mono">Shift + Arrows</kbd>
              </div>
              <div className="flex justify-between border-b border-border py-1.5 col-span-2">
                <span className="text-muted-foreground">Clear Selection / Reset Tool</span>
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded shadow-xs font-mono">Escape</kbd>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-bold text-foreground mb-2">Usage Guide</h4>
            <ul className="list-disc pl-4 space-y-2 text-xs text-muted-foreground">
              <li>
                <strong className="text-foreground">Direct Text Editing:</strong> Go to the <strong className="text-foreground">Edit</strong> tab, select <strong className="text-foreground">Edit Text</strong>, and click on any text box on the PDF. A text editor will open in-place.
              </li>
              <li>
                <strong className="text-foreground">Interactive Forms:</strong> Go to the <strong className="text-foreground">Forms</strong> tab, choose a field type, click to place it, and resize. They will export as real fillable fields.
              </li>
              <li>
                <strong className="text-foreground">Permanent Redaction:</strong> Use the redaction tool to permanently black out text. Underneath data is deleted during export.
              </li>
              <li>
                <strong className="text-foreground">Visual PDF Compare:</strong> Click <strong className="text-foreground">Compare</strong> in the toolbar, upload a revised PDF, and use the side-by-side or slider swipe mode to spot changes.
              </li>
            </ul>
          </div>
        </div>
      </Dialog>

      {/* Merge PDFs Modal */}
      <Dialog
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        title="Merge Multiple PDFs"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMergeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleMergePdfs} disabled={mergeFiles.length < 2}>
              Merge Documents
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Select and arrange multiple PDF files. They will be merged in order from top to bottom.
          </p>
          
          <div
            onClick={() => document.getElementById("merge-upload")?.click()}
            className="border-2 border-dashed border-border rounded-lg bg-muted/20 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-primary/60 transition-colors"
          >
            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
            <span className="text-xs font-semibold text-foreground">Click to upload PDFs</span>
            <input
              type="file"
              id="merge-upload"
              multiple
              accept=".pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setMergeFiles((prev) => [...prev, ...files]);
              }}
              className="hidden"
            />
          </div>

          {mergeFiles.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto border border-border rounded-lg p-2 bg-muted/10">
              {mergeFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-card border border-border rounded-md text-xs font-medium"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="truncate max-w-[180px]">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {idx > 0 && (
                      <button
                        onClick={() => {
                          const updated = [...mergeFiles];
                          const temp = updated[idx];
                          updated[idx] = updated[idx - 1];
                          updated[idx - 1] = temp;
                          setMergeFiles(updated);
                        }}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                    )}
                    {idx < mergeFiles.length - 1 && (
                      <button
                        onClick={() => {
                          const updated = [...mergeFiles];
                          const temp = updated[idx];
                          updated[idx] = updated[idx + 1];
                          updated[idx + 1] = temp;
                          setMergeFiles(updated);
                        }}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => setMergeFiles(mergeFiles.filter((_, i) => i !== idx))}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* Split PDF Modal */}
      <Dialog
        isOpen={isSplitOpen}
        onClose={() => setIsSplitOpen(false)}
        title="Split PDF"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSplitOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSplitPdf} disabled={!splitRanges.trim()}>
              Split & Download
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Split this document into multiple parts. Enter comma-separated page ranges. E.g., "1-2, 3-5" will split into two files: one containing pages 1-2, and one containing pages 3-5.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Define Split Ranges</label>
            <input
              type="text"
              value={splitRanges}
              onChange={(e) => setSplitRanges(e.target.value)}
              placeholder="e.g., 1-2, 3, 4-5"
              className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Dialog>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-lg shadow-lg text-xs font-semibold text-white flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200 ${
              t.type === "success"
                ? "bg-emerald-600 border border-emerald-500"
                : t.type === "warning"
                ? "bg-amber-600 border border-amber-500"
                : "bg-blue-600 border border-blue-500"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
      {/* Bates Stamping Modal */}
      <BatesDialog
        isOpen={isBatesOpen}
        onClose={() => setIsBatesOpen(false)}
        onApplyBates={handleApplyBates}
      />
    </div>
  );
}
