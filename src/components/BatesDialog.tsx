import React, { useState } from "react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { LayoutGrid } from "lucide-react";

interface BatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBates: (options: {
    prefix: string;
    suffix: string;
    startNumber: number;
    paddingLength: number;
    position: "topLeft" | "topCenter" | "topRight" | "bottomLeft" | "bottomCenter" | "bottomRight";
    fontSize: number;
    color: string;
  }) => void;
}

export const BatesDialog: React.FC<BatesDialogProps> = ({
  isOpen,
  onClose,
  onApplyBates,
}) => {
  const [prefix, setPrefix] = useState("BATES-");
  const [suffix, setSuffix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [paddingLength, setPaddingLength] = useState(6);
  const [position, setPosition] = useState<
    "topLeft" | "topCenter" | "topRight" | "bottomLeft" | "bottomCenter" | "bottomRight"
  >("bottomRight");
  const [fontSize, setFontSize] = useState(10);
  const [color, setColor] = useState("#000000");

  const positions = [
    { id: "topLeft", name: "Top Left" },
    { id: "topCenter", name: "Top Center" },
    { id: "topRight", name: "Top Right" },
    { id: "bottomLeft", name: "Bottom Left" },
    { id: "bottomCenter", name: "Bottom Center" },
    { id: "bottomRight", name: "Bottom Right" },
  ] as const;

  // Generate preview text
  const paddedNum = String(startNumber).padStart(paddingLength, "0");
  const previewText = `${prefix}${paddedNum}${suffix}`;

  const handleApply = () => {
    onApplyBates({
      prefix,
      suffix,
      startNumber,
      paddingLength,
      position,
      fontSize,
      color,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Bates Numbering (Legal Stamping)"
      maxWidth="md"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApply}>
            Apply Stamps
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 select-none text-sm text-muted-foreground">
        <p className="text-xs">
          Bates numbering is used in legal, medical, and business fields to place sequential identification numbers, dates, or marks on PDF pages.
        </p>

        {/* 1. Preview Panel */}
        <div className="border border-border rounded-xl p-3 bg-muted/20 flex flex-col gap-1 items-center justify-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Bates Number Preview (Page 1)
          </span>
          <span
            className="font-mono text-base font-semibold px-4 py-1.5 bg-background border border-border rounded-lg text-foreground shadow-xs max-w-full truncate"
            style={{ color }}
          >
            {previewText}
          </span>
        </div>

        {/* 2. Parameters Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Prefix</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g., CASE-2026-"
              className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Suffix</label>
            <input
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g., -CONFIDENTIAL"
              className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Starting Number</label>
            <input
              type="number"
              value={startNumber}
              onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
              min={1}
              className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Number Padding (Digits)</label>
            <select
              value={paddingLength}
              onChange={(e) => setPaddingLength(parseInt(e.target.value, 10))}
              className="w-full text-xs p-2.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[3, 4, 5, 6, 7, 8].map((len) => (
                <option key={len} value={len}>
                  {len} Digits (e.g., {String(1).padStart(len, "0")})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Style & Position Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border pt-4">
          {/* Position Select */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <span>Stamp Position</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 border border-border p-2 rounded-xl bg-muted/10 h-28">
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setPosition(pos.id)}
                  className={`text-[10px] font-semibold rounded-md border transition-all flex items-center justify-center text-center px-1 ${
                    position === pos.id
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground"
                  }`}
                >
                  {pos.name}
                </button>
              ))}
            </div>
          </div>

          {/* Font & Color Select */}
          <div className="space-y-3 flex flex-col justify-center">
            {/* Color */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Stamp Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-md border border-border cursor-pointer overflow-hidden p-0 bg-transparent"
                />
                <span className="text-xs font-mono">{color}</span>
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>Font Size</span>
                <span>{fontSize}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={24}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-primary bg-secondary h-1.5 rounded-lg cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
