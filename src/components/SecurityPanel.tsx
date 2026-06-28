import React, { useState } from "react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { usePdfStore } from "../store/usePdfStore";
import { addWatermarkText } from "../utils/pdfOperations";
import { loadPdfDocument } from "../utils/pdfEngine";
import { Lock, Eye, EyeOff, Sparkles } from "lucide-react";

interface SecurityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPassword: (password: string) => void;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({
  isOpen,
  onClose,
  onApplyPassword,
}) => {
  const { pdfFile, setPdfFile, setPdfDocument } = usePdfStore();

  // Password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Watermark state
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkColor, setWatermarkColor] = useState("#ff0000");
  const [watermarkSize, setWatermarkSize] = useState(50);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [watermarkLoading, setWatermarkLoading] = useState(false);

  const handleApplyPassword = () => {
    if (!password) {
      alert("Please enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    
    onApplyPassword(password);
    alert("Password protection configured! It will be applied when you export/download the PDF.");
    onClose();
  };

  const handleApplyWatermark = async () => {
    if (!pdfFile) return;
    if (!watermarkText.trim()) {
      alert("Please enter watermark text.");
      return;
    }

    try {
      setWatermarkLoading(true);
      
      const fileBytes = new Uint8Array(await pdfFile.arrayBuffer());
      
      // Apply watermark to the PDF bytes
      const watermarkedBytes = await addWatermarkText(fileBytes, watermarkText, {
        color: watermarkColor,
        fontSize: watermarkSize,
        opacity: watermarkOpacity,
        rotation: watermarkRotation,
      });

      // Create a new File and update the store
      const newFile = new File([watermarkedBytes as any], pdfFile.name, { type: "application/pdf" });
      setPdfFile(newFile);
      
      // Reload the PDF document to trigger re-rendering
      const doc = await loadPdfDocument(newFile);
      setPdfDocument(doc);
      
      alert("Watermark successfully added to all pages!");
      setWatermarkText(""); // clear input
      onClose();
    } catch (err) {
      console.error("Error applying watermark:", err);
      alert("Failed to apply watermark.");
    } finally {
      setWatermarkLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Document Security & Watermarks"
      maxWidth="md"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-6 select-none">
        {/* SECTION 1: PASSWORD PROTECTION */}
        <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/15 p-1.5 rounded-lg text-primary">
              <Lock className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Password Protect PDF</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Encrypt this PDF with a password. Anyone who opens the document will be prompted to enter this password.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-1 relative">
              <label className="text-[11px] font-semibold text-muted-foreground">Set Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full text-xs p-2.5 pr-10 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button variant="primary" className="w-full text-xs h-9" onClick={handleApplyPassword}>
              Apply Password Protection
            </Button>
          </div>
        </div>

        {/* SECTION 2: WATERMARKING */}
        <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/15 p-1.5 rounded-lg text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Add Text Watermark</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Overlay a text watermark on all pages. This changes the PDF file directly.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Watermark Text</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="CONFIDENTIAL / DRAFT / COPY"
                className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Color */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={watermarkColor}
                    onChange={(e) => setWatermarkColor(e.target.value)}
                    className="w-8 h-8 rounded-md border border-border cursor-pointer overflow-hidden p-0 bg-transparent"
                  />
                  <span className="text-xs font-mono">{watermarkColor}</span>
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Size</span>
                  <span>{watermarkSize}px</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={120}
                  value={watermarkSize}
                  onChange={(e) => setWatermarkSize(parseInt(e.target.value, 10))}
                  className="w-full accent-primary bg-secondary h-1.5 rounded-lg cursor-pointer mt-2"
                />
              </div>

              {/* Opacity */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Opacity</span>
                  <span>{Math.round(watermarkOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={Math.round(watermarkOpacity * 100)}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value) / 100)}
                  className="w-full accent-primary bg-secondary h-1.5 rounded-lg cursor-pointer mt-2"
                />
              </div>

              {/* Rotation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Rotation</span>
                  <span>{watermarkRotation}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={watermarkRotation}
                  onChange={(e) => setWatermarkRotation(parseInt(e.target.value, 10))}
                  className="w-full accent-primary bg-secondary h-1.5 rounded-lg cursor-pointer mt-2"
                />
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full text-xs h-9 bg-blue-600 hover:bg-blue-500"
              onClick={handleApplyWatermark}
              disabled={watermarkLoading}
            >
              {watermarkLoading ? "Applying Watermark..." : "Apply Watermark"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
