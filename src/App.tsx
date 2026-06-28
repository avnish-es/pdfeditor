import { useState } from "react";
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
} from "./utils/pdfOperations";
import { loadPdfDocument } from "./utils/pdfEngine";
import { Upload, FileText, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export default function App() {
  const {
    pdfFile,
    pdfDocument,
    currentPage,
    numPages,
    canvasStates,
    setCurrentPage,
    setPdfFile,
    setPdfDocument,
    pushHistory,
    saveCanvasState,
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

  // Merge/Split state
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [splitRanges, setSplitRanges] = useState("");

  // Security/Export state
  const [exportPassword, setExportPassword] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  // 1. Image Upload Handler
  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      fabric.Image.fromURL(imgUrl, (img) => {
        // Scale image to fit nicely
        img.scaleToWidth(200);
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.requestRenderAll();
        
        pushHistory();
        saveCanvasState(currentPage, fabricCanvas.toJSON());
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
      alert("Inserted a blank page after the current page.");
    } catch (err) {
      console.error("Error inserting blank page:", err);
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
      } catch (err) {
        console.error("Error deleting page:", err);
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
    } catch (err) {
      console.error("Error rotating page:", err);
    }
  };

  const handleMovePage = async (pageNum: number, direction: "up" | "down") => {
    if (!pdfFile) return;
    const targetIndex = pageNum - 1;
    const newIndex = direction === "up" ? targetIndex - 1 : targetIndex + 1;
    if (newIndex < 0 || newIndex >= numPages) return;

    try {
      const order = Array.from({ length: numPages }, (_, i) => i);
      // Swap order
      order[targetIndex] = newIndex;
      order[newIndex] = targetIndex;

      const bytes = new Uint8Array(await pdfFile.arrayBuffer());
      const newBytes = await reorderPages(bytes, order);
      const newFile = new File([newBytes as any], pdfFile.name, { type: "application/pdf" });
      setPdfFile(newFile);
      const doc = await loadPdfDocument(newFile);
      setPdfDocument(doc);
      setCurrentPage(newIndex + 1);
    } catch (err) {
      console.error("Error reordering pages:", err);
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
    } catch (err) {
      console.error("Error extracting page:", err);
    }
  };

  // 3. Signature Handler
  const handleSaveSignature = (signatureDataUrl: string) => {
    if (!fabricCanvas) return;
    fabric.Image.fromURL(signatureDataUrl, (img) => {
      img.scaleToWidth(150);
      // Center the signature on the canvas viewport
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
      alert("PDFs merged successfully!");
    } catch (err) {
      console.error("Merge error:", err);
      alert("Failed to merge PDFs.");
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
      alert("PDF split successfully!");
    } catch (err) {
      console.error("Split error:", err);
      alert("Failed to split PDF.");
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
      alert("PDF compressed successfully!");
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to compress PDF.");
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

      // Create a temporary canvas element for offscreen rendering
      const tempCanvasEl = document.createElement("canvas");
      document.body.appendChild(tempCanvasEl);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const savedState = canvasStates[pageNum];

        // Gather redaction rectangles
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

        // Gather interactive form fields
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

        // Check if there are annotations to render as PNG (excluding redactions and form fields)
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

          // Clean redactions and form fields out of the PNG layer (they are applied as actual PDF elements)
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

          // Export at 2x scale for print-quality sharpness
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

      // 1. Overlay annotations, redactions and interactive form fields
      let finalBytes = await overlayEditsOnPdf(originalBytes, pageEdits, redactions, formFields);

      // 2. Apply Password encryption if configured
      if (exportPassword) {
        setExportStatus("Encrypting PDF...");
        finalBytes = await encryptPdf(finalBytes, exportPassword, exportPassword);
      }

      // 3. Optimize & Compress structure
      finalBytes = await compressPdf(finalBytes);

      // 4. Download
      const blob = new Blob([finalBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFile.name.replace(".pdf", "_edited.pdf");
      link.click();
      URL.revokeObjectURL(url);

      alert("PDF exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
      setExportStatus("");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* 1. TOP TOOLBAR */}
      <TopToolbar
        onExport={handleExport}
        onCompareClick={() => setIsCompareOpen(true)}
        onOcrClick={() => setIsOcrOpen(true)}
        onMergeClick={() => setIsMergeOpen(true)}
        onSplitClick={() => setIsSplitOpen(true)}
        onSecurityClick={() => setIsSecurityOpen(true)}
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

      {/* 4. DIALOGS & MODALS */}
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
    </div>
  );
}
