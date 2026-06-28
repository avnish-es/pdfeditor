import React from "react";
import {
  MousePointer,
  Type,
  PenTool,
  Highlighter,
  Square,
  Circle as CircleIcon,
  Minus,
  ArrowUpRight,
  StickyNote,
  Trash2,
  Plus,
  RotateCw,
  FileDown,
  Signature,
  FileCheck,
  ToggleLeft,
  CheckSquare,
  Cpu,
  Lock,
  Compass,
  Image as ImageIcon,
  Heading,
  Hash,
} from "lucide-react";
import { usePdfStore } from "../store/usePdfStore";
import type { ToolType, ShapeType } from "../store/usePdfStore";
import { Button } from "./ui/Button";

interface LeftSidebarProps {
  onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInsertBlankPage: () => void;
  onDeletePage: () => void;
  onRotatePage: () => void;
  onExtractPages: () => void;
  onOpenSignatureDialog: () => void;
  onRunOcr: () => void;
  onTriggerCompress: () => void;
  onBatesClick: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onAddImage,
  onInsertBlankPage,
  onDeletePage,
  onRotatePage,
  onExtractPages,
  onOpenSignatureDialog,
  onRunOcr,
  onTriggerCompress,
  onBatesClick,
}) => {
  const {
    activeTool,
    selectedShape,
    drawColor,
    drawWidth,
    sidebarTab,
    pdfFile,
    setActiveTool,
    setSelectedShape,
    setDrawColor,
    setDrawWidth,
    setSidebarTab,
  } = usePdfStore();

  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const tabs = [
    { id: "edit", label: "Edit", icon: Type },
    { id: "annotate", label: "Comment", icon: Highlighter },
    { id: "pages", label: "Pages", icon: Compass },
    { id: "forms", label: "Forms", icon: FileCheck },
    { id: "sign", label: "Sign", icon: Signature },
    { id: "advanced", label: "AI & Tools", icon: Cpu },
    { id: "security", label: "Security", icon: Lock },
  ] as const;

  const colors = [
    "#000000", // Black
    "#ef4444", // Red
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Yellow
    "#8b5cf6", // Purple
  ];

  const handleToolClick = (tool: ToolType, shape: ShapeType | null = null) => {
    setActiveTool(tool);
    setSelectedShape(shape);
  };

  return (
    <div className="flex h-full border-r border-border bg-card text-card-foreground select-none">
      {/* Primary Vertical Icons Sidebar */}
      <div className="w-16 border-r border-border flex flex-col items-center py-4 gap-4 bg-muted/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = sidebarTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all gap-1 text-[10px] font-semibold ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              title={tab.label}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Tool Properties panel */}
      <div className="w-64 flex flex-col p-4 overflow-y-auto">
        {!pdfFile ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
            <Compass className="h-8 w-8 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium">Please open a PDF document to start editing.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* TAB: EDIT */}
            {sidebarTab === "edit" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Selection & Text
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={activeTool === "select" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs"
                      onClick={() => handleToolClick("select")}
                    >
                      <MousePointer className="h-3.5 w-3.5" />
                      Select
                    </Button>
                    <Button
                      variant={activeTool === "edit-text" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs"
                      onClick={() => handleToolClick("edit-text")}
                      title="Click on existing text in the PDF to edit it directly"
                    >
                      <Type className="h-3.5 w-3.5" />
                      Edit Text
                    </Button>
                    <Button
                      variant={activeTool === "add-text" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs col-span-2"
                      onClick={() => handleToolClick("add-text")}
                    >
                      <Heading className="h-3.5 w-3.5" />
                      Add New Text
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Images
                  </h4>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-9 text-xs"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Insert Image
                  </Button>
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={onAddImage}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* TAB: ANNOTATE */}
            {sidebarTab === "annotate" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Markup Tools
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={activeTool === "draw" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs"
                      onClick={() => handleToolClick("draw")}
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      Draw
                    </Button>
                    <Button
                      variant={activeTool === "highlight" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs"
                      onClick={() => handleToolClick("highlight")}
                    >
                      <Highlighter className="h-3.5 w-3.5" />
                      Highlight
                    </Button>
                    <Button
                      variant={activeTool === "sticky-note" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs col-span-2"
                      onClick={() => handleToolClick("sticky-note")}
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                      Sticky Note
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Shapes
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={activeTool === "shape" && selectedShape === "rect" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs"
                      onClick={() => handleToolClick("shape", "rect")}
                    >
                      <Square className="h-3.5 w-3.5" />
                      Rectangle
                    </Button>
                    <Button
                      variant={activeTool === "shape" && selectedShape === "circle" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs"
                      onClick={() => handleToolClick("shape", "circle")}
                    >
                      <CircleIcon className="h-3.5 w-3.5" />
                      Circle
                    </Button>
                    <Button
                      variant={activeTool === "shape" && selectedShape === "line" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs"
                      onClick={() => handleToolClick("shape", "line")}
                    >
                      <Minus className="h-3.5 w-3.5" />
                      Line
                    </Button>
                    <Button
                      variant={activeTool === "shape" && selectedShape === "arrow" ? "primary" : "outline"}
                      className="justify-start gap-2 h-9 text-xs"
                      onClick={() => handleToolClick("shape", "arrow")}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Arrow
                    </Button>
                  </div>
                </div>

                {/* Draw Settings */}
                <div className="border-t border-border pt-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {colors.map((c) => (
                        <button
                          key={c}
                          className={`w-6 h-6 rounded-full border-2 ${
                            drawColor === c ? "border-primary scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                          onClick={() => setDrawColor(c)}
                        />
                      ))}
                      <input
                        type="color"
                        value={drawColor}
                        onChange={(e) => setDrawColor(e.target.value)}
                        className="w-6 h-6 rounded-full border-none cursor-pointer overflow-hidden p-0 bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1">
                      <span>Stroke Thickness</span>
                      <span>{drawWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={drawWidth}
                      onChange={(e) => setDrawWidth(parseInt(e.target.value, 10))}
                      className="w-full accent-primary bg-secondary h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PAGES */}
            {sidebarTab === "pages" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Page Management
                </h4>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={onInsertBlankPage}
                  >
                    <Plus className="h-3.5 w-3.5 text-green-500" />
                    Insert Blank Page
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2 h-9 text-xs text-destructive hover:bg-destructive/10"
                    onClick={onDeletePage}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Current Page
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={onRotatePage}
                  >
                    <RotateCw className="h-3.5 w-3.5 text-blue-500" />
                    Rotate 90° Clockwise
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={onExtractPages}
                  >
                    <FileDown className="h-3.5 w-3.5 text-purple-500" />
                    Extract Page
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={onBatesClick}
                  >
                    <Hash className="h-3.5 w-3.5 text-amber-500" />
                    Bates Numbering
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: FORMS */}
            {sidebarTab === "forms" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Interactive Form Fields
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Create fillable forms. Drag fields onto the page, then export.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant={activeTool === "form" && selectedShape === "rect" ? "primary" : "outline"}
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={() => handleToolClick("form", "rect")}
                  >
                    <Type className="h-3.5 w-3.5 text-indigo-500" />
                    Text Input Field
                  </Button>
                  <Button
                    variant={activeTool === "form" && selectedShape === "circle" ? "primary" : "outline"}
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={() => handleToolClick("form", "circle")}
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                    Checkbox
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: SIGN */}
            {sidebarTab === "sign" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Digital Signatures
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Draw, type, or upload your signature to place it onto the PDF.
                </p>
                <Button
                  variant="primary"
                  className="w-full justify-center gap-2 h-9 text-xs shadow-md"
                  onClick={onOpenSignatureDialog}
                >
                  <Signature className="h-4 w-4" />
                  Add New Signature
                </Button>
              </div>
            )}

            {/* TAB: ADVANCED */}
            {sidebarTab === "advanced" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Advanced PDF Tools
                </h4>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="justify-start gap-2 h-9 text-xs text-left"
                    onClick={onRunOcr}
                  >
                    <Cpu className="h-3.5 w-3.5 text-yellow-500" />
                    Run OCR Text Recognition
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2 h-9 text-xs"
                    onClick={onTriggerCompress}
                  >
                    <ToggleLeft className="h-3.5 w-3.5 text-emerald-500" />
                    Compress PDF Size
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: SECURITY */}
            {sidebarTab === "security" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Document Protection
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Set passwords, restrict editing, or permanently black out sensitive information.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant={activeTool === "redact" ? "primary" : "outline"}
                    className="justify-start gap-2 h-9 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                    onClick={() => handleToolClick("redact")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Redact (Permanent Blackout)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
