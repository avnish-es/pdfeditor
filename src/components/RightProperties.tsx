import React from "react";
import {
  Bold,
  Italic,
  Underline,
  Trash2,
  Strikethrough,
} from "lucide-react";
import { usePdfStore } from "../store/usePdfStore";
import { Button } from "./ui/Button";

export const RightProperties: React.FC = () => {
  const {
    selectedObject,
    selectedObjectProperties,
    updateSelectedObjectProperties,
  } = usePdfStore();

  if (!selectedObject || !selectedObjectProperties) {
    return (
      <div className="w-64 border-l border-border bg-card text-card-foreground p-4 flex flex-col items-center justify-center text-center text-muted-foreground select-none">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
          Properties Panel
        </p>
        <p className="text-xs px-4">
          Select any text, drawing, shape, or image on the canvas to edit its properties.
        </p>
      </div>
    );
  }

  const isText =
    selectedObject.type === "i-text" ||
    selectedObject.type === "textbox" ||
    selectedObject.type === "text";

  const handleDelete = () => {
    if (selectedObject.canvas) {
      selectedObject.canvas.remove(selectedObject);
      selectedObject.canvas.discardActiveObject();
      selectedObject.canvas.requestRenderAll();
      
      // Save canvas state after deletion
      const usePdfStoreState = usePdfStore.getState();
      const activePage = usePdfStoreState.currentPage;
      const json = selectedObject.canvas.toJSON();
      usePdfStoreState.saveCanvasState(activePage, json);
      usePdfStoreState.setSelectedObject(null);
    }
  };

  const handlePropertyChange = (key: string, value: any) => {
    updateSelectedObjectProperties({ [key]: value });
  };

  const fontFamilies = [
    "Inter",
    "Roboto",
    "Helvetica",
    "Times New Roman",
    "Georgia",
    "Courier New",
  ];

  return (
    <div className="w-64 border-l border-border bg-card text-card-foreground p-4 flex flex-col overflow-y-auto select-none space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Properties
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          title="Delete selected element"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Text Properties */}
      {isText && (
        <div className="space-y-4">
          {/* Text Content */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Text Content</label>
            <textarea
              value={selectedObjectProperties.text || ""}
              onChange={(e) => handlePropertyChange("text", e.target.value)}
              rows={2}
              className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Font Family */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Font Family</label>
            <select
              value={selectedObjectProperties.fontFamily || "Inter"}
              onChange={(e) => handlePropertyChange("fontFamily", e.target.value)}
              className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {fontFamilies.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Font Size</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={selectedObjectProperties.fontSize || 16}
                onChange={(e) => handlePropertyChange("fontSize", parseInt(e.target.value, 10) || 12)}
                className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() =>
                    handlePropertyChange("fontSize", (selectedObjectProperties.fontSize || 16) - 1)
                  }
                >
                  -
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() =>
                    handlePropertyChange("fontSize", (selectedObjectProperties.fontSize || 16) + 1)
                  }
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          {/* Font Styling */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Style & Weight</label>
            <div className="flex gap-1.5 bg-muted/40 p-0.5 rounded-lg border border-border">
              <Button
                variant={selectedObjectProperties.fontWeight === "bold" ? "primary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  handlePropertyChange(
                    "fontWeight",
                    selectedObjectProperties.fontWeight === "bold" ? "normal" : "bold"
                  )
                }
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={selectedObjectProperties.fontStyle === "italic" ? "primary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  handlePropertyChange(
                    "fontStyle",
                    selectedObjectProperties.fontStyle === "italic" ? "normal" : "italic"
                  )
                }
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={selectedObjectProperties.underline ? "primary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePropertyChange("underline", !selectedObjectProperties.underline)}
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={selectedObjectProperties.linethrough ? "primary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  handlePropertyChange("linethrough", !selectedObjectProperties.linethrough)
                }
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Colors & Stroke */}
      <div className="space-y-4">
        {/* Fill Color */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Fill Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={
                selectedObjectProperties.fill && selectedObjectProperties.fill !== "transparent"
                  ? selectedObjectProperties.fill
                  : "#000000"
              }
              disabled={selectedObjectProperties.fill === "transparent"}
              onChange={(e) => handlePropertyChange("fill", e.target.value)}
              className="w-8 h-8 rounded-md border border-border cursor-pointer overflow-hidden p-0 bg-transparent disabled:opacity-50"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="transparent-fill"
                checked={selectedObjectProperties.fill === "transparent"}
                onChange={(e) =>
                  handlePropertyChange("fill", e.target.checked ? "transparent" : "#3b82f6")
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
              />
              <label htmlFor="transparent-fill" className="text-xs font-medium cursor-pointer">
                Transparent
              </label>
            </div>
          </div>
        </div>

        {/* Stroke Color & Width for shapes */}
        {!isText && selectedObject.type !== "image" && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Border Color</label>
              <input
                type="color"
                value={selectedObjectProperties.stroke || "#000000"}
                onChange={(e) => handlePropertyChange("stroke", e.target.value)}
                className="w-8 h-8 rounded-md border border-border cursor-pointer overflow-hidden p-0 bg-transparent"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1">
                <span>Border Width</span>
                <span>{selectedObjectProperties.strokeWidth || 1}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                value={selectedObjectProperties.strokeWidth || 1}
                onChange={(e) => handlePropertyChange("strokeWidth", parseInt(e.target.value, 10))}
                className="w-full accent-primary bg-secondary h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Opacity */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1">
            <span>Opacity</span>
            <span>{Math.round((selectedObjectProperties.opacity !== undefined ? selectedObjectProperties.opacity : 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((selectedObjectProperties.opacity !== undefined ? selectedObjectProperties.opacity : 1) * 100)}
            onChange={(e) => handlePropertyChange("opacity", parseFloat(e.target.value) / 100)}
            className="w-full accent-primary bg-secondary h-1.5 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
