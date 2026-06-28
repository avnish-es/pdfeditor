import React, { useRef, useState, useEffect } from "react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { PenTool, Type, Upload } from "lucide-react";

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (signatureDataUrl: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
}) => {
  const [activeTab, setActiveTab] = useState<"draw" | "type" | "upload">("draw");
  
  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Typing state
  const [typedText, setTypedText] = useState("");
  const [selectedFont, setSelectedFont] = useState("font-signature-1");
  
  // Upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cursive signature fonts
  const fonts = [
    { id: "font-signature-1", name: "Cursive Classic", style: "font-serif italic tracking-wider font-semibold" },
    { id: "font-signature-2", name: "Modern Script", style: "font-mono italic tracking-widest text-lg" },
    { id: "font-signature-3", name: "Elegant Signature", style: "font-sans italic font-light tracking-wide" },
  ];

  // Initialize Drawing Canvas
  useEffect(() => {
    if (activeTab === "draw" && canvasRef.current && isOpen) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1e3a8a"; // Dark blue signature
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [activeTab, isOpen]);

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getMousePos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Prevent scrolling on touch devices
    if (e.cancelable) e.preventDefault();

    const pos = getMousePos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getMousePos = (canvas: HTMLCanvasElement, e: any) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Upload Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Signature
  const handleSave = () => {
    let signatureDataUrl = "";

    if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (canvas) {
        // Check if canvas is empty
        const ctx = canvas.getContext("2d");
        const buffer = new Uint32Array(
          ctx!.getImageData(0, 0, canvas.width, canvas.height).data.buffer
        );
        const isEmpty = !buffer.some(color => color !== 0);
        if (isEmpty) {
          alert("Please draw your signature first.");
          return;
        }
        signatureDataUrl = canvas.toDataURL("image/png");
      }
    } else if (activeTab === "type") {
      if (!typedText.trim()) {
        alert("Please type your signature first.");
        return;
      }

      // Convert typed signature to image using a temporary offscreen canvas
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 150;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Font styling based on selection
        let fontStyle = "italic 32px Georgia";
        if (selectedFont === "font-signature-1") fontStyle = "italic bold 36px cursive, Georgia";
        else if (selectedFont === "font-signature-2") fontStyle = "italic 30px 'Courier New'";
        else if (selectedFont === "font-signature-3") fontStyle = "italic 34px 'Times New Roman'";
        
        ctx.font = fontStyle;
        ctx.fillStyle = "#1e3a8a"; // Dark blue signature
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
        signatureDataUrl = canvas.toDataURL("image/png");
      }
    } else if (activeTab === "upload") {
      if (!uploadedImage) {
        alert("Please upload a signature image first.");
        return;
      }
      signatureDataUrl = uploadedImage;
    }

    if (signatureDataUrl) {
      onSaveSignature(signatureDataUrl);
      onClose();
      // Reset states
      setTypedText("");
      setUploadedImage(null);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Digital Signature"
      maxWidth="md"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Apply Signature
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("draw")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "draw"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenTool className="h-4 w-4" />
            Draw
          </button>
          <button
            onClick={() => setActiveTab("type")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "type"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Type className="h-4 w-4" />
            Type
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "upload"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>

        {/* Tab Content: DRAW */}
        {activeTab === "draw" && (
          <div className="flex flex-col gap-2">
            <div className="border border-dashed border-border rounded-lg bg-muted/20 overflow-hidden relative h-[180px]">
              <canvas
                ref={canvasRef}
                width={450}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full bg-white cursor-crosshair"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                className="absolute bottom-2 right-2 text-xs bg-white/80 backdrop-blur-xs hover:bg-white border border-border"
              >
                Clear
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Use your mouse or touch screen to draw your signature.
            </p>
          </div>
        )}

        {/* Tab Content: TYPE */}
        {activeTab === "type" && (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Type your name</label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="John Doe"
                className="w-full p-2.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={30}
              />
            </div>

            {typedText && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Choose style</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {fonts.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFont(f.id)}
                      className={`p-4 border rounded-lg text-center transition-all bg-white text-blue-900 truncate ${
                        selectedFont === f.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <span className={f.style}>{typedText}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: UPLOAD */}
        {activeTab === "upload" && (
          <div className="flex flex-col gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg bg-muted/20 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/60 transition-colors h-[180px] text-center"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-semibold text-foreground">
                Click to upload signature image
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                PNG, JPG or SVG (transparent PNG works best)
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            {uploadedImage && (
              <div className="border border-border rounded-lg p-2 bg-white flex items-center justify-center h-[100px] relative">
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-h-full max-w-full object-contain"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-2 right-2 text-xs bg-white/80 backdrop-blur-xs hover:bg-white border border-border"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
