import React, { useState } from "react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { usePdfStore } from "../store/usePdfStore";
import { renderPdfPage } from "../utils/pdfEngine";
import Tesseract from "tesseract.js";
import { Clipboard, Download, Loader2 } from "lucide-react";

interface OcrPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OcrPanel: React.FC<OcrPanelProps> = ({ isOpen, onClose }) => {
  const { pdfDocument, currentPage } = usePdfStore();
  const [ocrStatus, setOcrStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [extractedText, setExtractedText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const runOcr = async () => {
    if (!pdfDocument) return;

    try {
      setLoading(true);
      setOcrStatus("Preparing document page...");
      setProgress(0);
      setExtractedText("");

      // Create an offscreen canvas to render the page at high resolution (2x) for better OCR accuracy
      const canvas = document.createElement("canvas");
      await renderPdfPage(pdfDocument, currentPage, canvas, 2.0, 0);

      setOcrStatus("Initializing OCR Engine...");
      
      // Run Tesseract OCR on the canvas image
      const result = await Tesseract.recognize(
        canvas,
        "eng", // English language pack
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setOcrStatus("Recognizing text...");
              setProgress(Math.round(m.progress * 100));
            } else {
              setOcrStatus(m.status);
            }
          },
        }
      );

      setExtractedText(result.data.text);
      setOcrStatus("Completed successfully!");
      setProgress(100);
    } catch (err) {
      console.error("OCR Error:", err);
      setOcrStatus("Failed to extract text. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      alert("Text copied to clipboard!");
    }
  };

  const handleDownloadText = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `extracted_text_page_${currentPage}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="OCR Optical Character Recognition"
      maxWidth="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {extractedText && (
            <>
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1.5"
              >
                <Clipboard className="h-4 w-4" />
                Copy Text
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadText}
                className="flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Download TXT
              </Button>
            </>
          )}
          {!loading && (
            <Button variant="primary" onClick={runOcr}>
              Extract Text from Page {currentPage}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Convert scanned PDF pages or images into editable text using client-side OCR. All processing is done 100% locally in your browser for maximum privacy.
        </p>

        {loading && (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/25 rounded-lg border border-border">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
            <span className="text-sm font-semibold text-foreground">{ocrStatus}</span>
            <div className="w-full bg-secondary h-2 rounded-full mt-4 max-w-xs overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-1.5">{progress}%</span>
          </div>
        )}

        {!loading && !extractedText && (
          <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed border-border rounded-lg text-center">
            <CpuIcon className="h-10 w-10 text-muted-foreground/60 mb-3 stroke-[1.5]" />
            <h4 className="text-sm font-bold mb-1 text-foreground">Ready to Scan</h4>
            <p className="text-xs text-muted-foreground max-w-xs">
              Click the button below to extract all text on Page {currentPage} of the document.
            </p>
          </div>
        )}

        {extractedText && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-foreground">Extracted Text</label>
            <textarea
              value={extractedText}
              readOnly
              rows={10}
              className="w-full text-xs p-3 rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}
      </div>
    </Dialog>
  );
};

// Simple Icon fallback
const CpuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="16" height="16" x="4" y="4" rx="2" />
    <rect width="6" height="6" x="9" y="9" rx="1" />
    <path d="M9 1v3" />
    <path d="M15 1v3" />
    <path d="M9 20v3" />
    <path d="M15 20v3" />
    <path d="M20 9h3" />
    <path d="M20 15h3" />
    <path d="M1 9h3" />
    <path d="M1 15h3" />
  </svg>
);
