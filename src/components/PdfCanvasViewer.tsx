import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import { usePdfStore } from "../store/usePdfStore";
import { renderPdfPage, getPageTextItems, type TextItemInfo } from "../utils/pdfEngine";

interface PdfCanvasViewerProps {
  onCanvasInit: (canvas: fabric.Canvas) => void;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({ onCanvasInit }) => {
  const {
    pdfDocument,
    currentPage,
    zoom,
    rotation,
    activeTool,
    selectedShape,
    drawColor,
    drawWidth,
    canvasStates,
    saveCanvasState,
    setSelectedObject,
    pushHistory,
    canvasVersion,
  } = usePdfStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [textItems, setTextItems] = useState<TextItemInfo[]>([]);
  const [hoveredTextIndex, setHoveredTextIndex] = useState<number | null>(null);

  // 1. Render PDF page and initialize Fabric Canvas
  useEffect(() => {
    let active = true;

    const initPage = async () => {
      if (!pdfDocument || !pdfCanvasRef.current || !fabricCanvasElRef.current) return;

      try {
        setLoading(true);
        
        // Clean up previous fabric canvas
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }

        // Render PDF page
        const { width, height } = await renderPdfPage(
          pdfDocument,
          currentPage,
          pdfCanvasRef.current,
          zoom,
          rotation
        );

        if (!active) return;

        // Set overlay canvas size
        fabricCanvasElRef.current.width = width;
        fabricCanvasElRef.current.height = height;

        // Initialize Fabric Canvas
        const fCanvas = new fabric.Canvas(fabricCanvasElRef.current, {
          width: width,
          height: height,
          selection: true,
        });

        fabricCanvasRef.current = fCanvas;
        onCanvasInit(fCanvas);

        // Load existing edits for this page if they exist
        const savedState = canvasStates[currentPage];
        if (savedState && savedState.objects && savedState.objects.length > 0) {
          fCanvas.loadFromJSON(savedState, () => {
            fCanvas.requestRenderAll();
          });
        }

        // Setup Event Listeners
        setupCanvasEvents(fCanvas);

        // Load PDF text items for direct editing
        const items = await getPageTextItems(pdfDocument, currentPage, zoom, rotation);
        if (active) {
          setTextItems(items);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error rendering PDF or initializing canvas:", err);
        if (active) setLoading(false);
      }
    };

    initPage();

    return () => {
      active = false;
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [pdfDocument, currentPage, zoom, rotation]);

  // 1.5. Listen to undo/redo triggers to reload the canvas
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas) return;

    const store = usePdfStore.getState();
    if (store.isHistoryTraversal) {
      const savedState = canvasStates[currentPage];
      fCanvas.clear();
      if (savedState && savedState.objects && savedState.objects.length > 0) {
        fCanvas.loadFromJSON(savedState, () => {
          fCanvas.requestRenderAll();
        });
      } else {
        fCanvas.requestRenderAll();
      }
    }
  }, [canvasVersion, currentPage]);

  // 2. Respond to tool changes
  useEffect(() => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas) return;

    // Reset interactions
    fCanvas.isDrawingMode = false;
    fCanvas.selection = true;
    fCanvas.forEachObject((obj) => {
      obj.selectable = true;
      obj.evented = true;
    });

    // Configure based on active tool
    if (activeTool === "draw" || activeTool === "highlight") {
      fCanvas.isDrawingMode = true;
      
      const isHighlighter = activeTool === "highlight";
      fCanvas.freeDrawingBrush.color = isHighlighter 
        ? "rgba(253, 224, 71, 0.45)" // semi-transparent yellow
        : drawColor;
        
      fCanvas.freeDrawingBrush.width = isHighlighter ? 12 : drawWidth;
      
      // Select brush type if needed (Pencil is default)
      fCanvas.freeDrawingBrush = new fabric.PencilBrush(fCanvas);
      fCanvas.freeDrawingBrush.color = isHighlighter ? "rgba(253, 224, 71, 0.45)" : drawColor;
      fCanvas.freeDrawingBrush.width = isHighlighter ? 12 : drawWidth;
    } else if (activeTool === "edit-text") {
      // In edit-text mode, we make the canvas objects unselectable so we can click the background text items
      fCanvas.selection = false;
      fCanvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    } else if (activeTool === "shape" || activeTool === "add-text" || activeTool === "sticky-note" || activeTool === "redact" || activeTool === "form") {
      // These tools are handled by drawing / clicking handlers on the canvas
      fCanvas.selection = false;
    }

    fCanvas.requestRenderAll();
  }, [activeTool, drawColor, drawWidth, selectedShape]);

  // Setup fabric events
  const setupCanvasEvents = (fCanvas: fabric.Canvas) => {
    let isMouseDown = false;
    let startX = 0;
    let startY = 0;
    let activeShape: fabric.Object | null = null;

    // Selection events
    fCanvas.on("selection:created", (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    fCanvas.on("selection:updated", (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    fCanvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    // Object modification (move, resize, rotate)
    fCanvas.on("object:modified", () => {
      pushHistory();
      saveCanvasState(currentPage, fCanvas.toJSON());
    });

    // Drawing paths
    fCanvas.on("path:created", () => {
      pushHistory();
      saveCanvasState(currentPage, fCanvas.toJSON());
    });

    // Custom drawing of shapes/text on mouse down, move, up
    fCanvas.on("mouse:down", (options) => {
      const pointer = fCanvas.getPointer(options.e);
      isMouseDown = true;
      startX = pointer.x;
      startY = pointer.y;

      const state = usePdfStore.getState();

      if (state.activeTool === "add-text") {
        // Add new text box
        const text = new fabric.IText("Double click to edit", {
          left: startX,
          top: startY,
          fontSize: state.textFontSize,
          fontFamily: state.textFontFamily,
          fill: state.drawColor,
          fontWeight: state.isBold ? "bold" : "normal",
          fontStyle: state.isItalic ? "italic" : "normal",
        });
        fCanvas.add(text);
        fCanvas.setActiveObject(text);
        text.enterEditing();
        
        pushHistory();
        saveCanvasState(currentPage, fCanvas.toJSON());
        state.setActiveTool("select");
      } else if (state.activeTool === "sticky-note") {
        // Add sticky note (yellow box with text)
        const rect = new fabric.Rect({
          left: startX,
          top: startY,
          width: 150,
          height: 150,
          fill: "#fef08a", // yellow-200
          stroke: "#facc15", // yellow-400
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          shadow: new fabric.Shadow({
            color: "rgba(0,0,0,0.15)",
            blur: 8,
            offsetX: 4,
            offsetY: 4,
          }),
        });

        const text = new fabric.Textbox("Write a note...", {
          left: startX + 12,
          top: startY + 12,
          width: 126,
          fontSize: 14,
          fontFamily: "Inter",
          fill: "#1e293b",
        });

        // Group them
        const group = new fabric.Group([rect, text], {
          left: startX,
          top: startY,
        });

        fCanvas.add(group);
        fCanvas.setActiveObject(group);
        
        pushHistory();
        saveCanvasState(currentPage, fCanvas.toJSON());
        state.setActiveTool("select");
      } else if (state.activeTool === "shape" && state.selectedShape) {
        // Create initial shape
        const shapeColor = state.drawColor;
        const fill = state.fillColor;
        const strokeWidth = state.drawWidth;

        if (state.selectedShape === "rect") {
          activeShape = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: fill,
            stroke: shapeColor,
            strokeWidth: strokeWidth,
          });
        } else if (state.selectedShape === "circle") {
          activeShape = new fabric.Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: fill,
            stroke: shapeColor,
            strokeWidth: strokeWidth,
          });
        } else if (state.selectedShape === "line") {
          activeShape = new fabric.Line([startX, startY, startX, startY], {
            stroke: shapeColor,
            strokeWidth: strokeWidth,
          });
        } else if (state.selectedShape === "arrow") {
          // Arrow is drawn as a line; we will add the head on mouse up
          activeShape = new fabric.Line([startX, startY, startX, startY], {
            stroke: shapeColor,
            strokeWidth: strokeWidth,
          });
        }

        if (activeShape) {
          fCanvas.add(activeShape);
          fCanvas.renderAll();
        }
      } else if (state.activeTool === "redact") {
        // Redaction box (solid black)
        activeShape = new fabric.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: "#000000",
          stroke: "#ef4444", // red outline while drawing
          strokeWidth: 1,
          opacity: 0.85,
        });
        fCanvas.add(activeShape);
        fCanvas.renderAll();
      } else if (state.activeTool === "form" && state.selectedShape) {
        // Interactive form fields (visual helper on screen)
        const isCheckbox = state.selectedShape === "circle";
        
        if (isCheckbox) {
          // Checkbox field
          const field = new fabric.Rect({
            left: startX,
            top: startY,
            width: 20,
            height: 20,
            fill: "rgba(16, 185, 129, 0.1)", // translucent green
            stroke: "#10b981",
            strokeWidth: 1.5,
            rx: 3,
            ry: 3,
          });
          field.set("data", { type: "form-checkbox", checked: false });
          fCanvas.add(field);
          fCanvas.setActiveObject(field);
        } else {
          // Text Input Field
          const field = new fabric.Rect({
            left: startX,
            top: startY,
            width: 140,
            height: 24,
            fill: "rgba(59, 130, 246, 0.1)", // translucent blue
            stroke: "#3b82f6",
            strokeWidth: 1.5,
            rx: 2,
            ry: 2,
          });
          
          const textHelper = new fabric.Text("Form Text Field", {
            left: startX + 6,
            top: startY + 5,
            fontSize: 10,
            fontFamily: "Inter",
            fill: "#3b82f6",
            selectable: false,
          });

          const group = new fabric.Group([field, textHelper], {
            left: startX,
            top: startY,
          });
          group.set("data", { type: "form-text", value: "" });

          fCanvas.add(group);
          fCanvas.setActiveObject(group);
        }
        
        pushHistory();
        saveCanvasState(currentPage, fCanvas.toJSON());
        state.setActiveTool("select");
      }
    });

    fCanvas.on("mouse:move", (options) => {
      if (!isMouseDown || !activeShape) return;
      const pointer = fCanvas.getPointer(options.e);
      const currentX = pointer.x;
      const currentY = pointer.y;

      const state = usePdfStore.getState();

      if (state.activeTool === "shape" && state.selectedShape) {
        if (state.selectedShape === "rect") {
          const width = currentX - startX;
          const height = currentY - startY;
          activeShape.set({
            width: Math.abs(width),
            height: Math.abs(height),
            left: width < 0 ? currentX : startX,
            top: height < 0 ? currentY : startY,
          });
        } else if (state.selectedShape === "circle") {
          const rx = Math.abs(currentX - startX);
          const ry = Math.abs(currentY - startY);
          const radius = Math.sqrt(rx * rx + ry * ry) / 2;
          (activeShape as any).set({
            radius: radius,
            left: currentX < startX ? startX - radius * 2 : startX,
            top: currentY < startY ? startY - radius * 2 : startY,
          });
        } else if (state.selectedShape === "line" || state.selectedShape === "arrow") {
          const line = activeShape as fabric.Line;
          line.set({ x2: currentX, y2: currentY });
        }
      } else if (state.activeTool === "redact") {
        const width = currentX - startX;
        const height = currentY - startY;
        activeShape.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width < 0 ? currentX : startX,
          top: height < 0 ? currentY : startY,
        });
      }

      fCanvas.renderAll();
    });

    fCanvas.on("mouse:up", (options) => {
      isMouseDown = false;
      const state = usePdfStore.getState();

      if (activeShape) {
        if (state.activeTool === "shape" && state.selectedShape === "arrow") {
          // Add arrow head to the line
          const pointer = fCanvas.getPointer(options.e);
          const line = activeShape as fabric.Line;
          
          const x1 = line.x1 || 0;
          const y1 = line.y1 || 0;
          const x2 = pointer.x;
          const y2 = pointer.y;
          
          // Calculate angle of line
          const angle = Math.atan2(y2 - y1, x2 - x1);
          
          // Arrow head points
          const headLength = 15;
          const tox = x2;
          const toy = y2;
          
          const angle1 = angle - Math.PI / 6;
          const angle2 = angle + Math.PI / 6;
          
          const arrowHead = new fabric.Polyline(
            [
              { x: tox, y: toy },
              { x: tox - headLength * Math.cos(angle1), y: toy - headLength * Math.sin(angle1) },
              { x: tox - headLength * Math.cos(angle2), y: toy - headLength * Math.sin(angle2) },
              { x: tox, y: toy },
            ],
            {
              fill: state.drawColor,
              stroke: state.drawColor,
              strokeWidth: state.drawWidth,
            }
          );
          
          // Group line and head
          fCanvas.remove(line);
          const arrowGroup = new fabric.Group([line, arrowHead]);
          fCanvas.add(arrowGroup);
          fCanvas.setActiveObject(arrowGroup);
        } else if (state.activeTool === "redact") {
          // Finalize redaction box (solid black, no outline, metadata set)
          activeShape.set({
            stroke: "transparent",
            strokeWidth: 0,
            opacity: 1.0,
          });
          activeShape.set("data", { type: "redaction" });
        }
        
        activeShape = null;
        pushHistory();
        saveCanvasState(currentPage, fCanvas.toJSON());
        
        // Go back to select tool
        state.setActiveTool("select");
      }
    });
  };

  // Click handler for direct text editing
  const handleTextItemClick = (item: TextItemInfo) => {
    const fCanvas = fabricCanvasRef.current;
    if (!fCanvas || activeTool !== "edit-text") return;

    // 1. Draw a background-colored rectangle over the original text to hide it.
    // In most PDFs, background is white, but we can make it custom or match.
    // Let's draw a white rectangle.
    const hideRect = new fabric.Rect({
      left: item.x - 2,
      top: item.y,
      width: item.width + 4,
      height: item.height + 4,
      fill: "#ffffff",
      stroke: "transparent",
      selectable: false,
      evented: false,
    });
    fCanvas.add(hideRect);

    // 2. Add an editable Fabric IText on top of it at the exact coordinates
    const editableText = new fabric.IText(item.text, {
      left: item.x,
      top: item.y,
      fontSize: item.fontSize,
      fontFamily: "Inter", // default to Inter for clean editing, or we can use item.fontFamily
      fill: "#000000",
      fontWeight: "normal",
    });

    editableText.on("editing:exited", () => {
      saveCanvasState(currentPage, fCanvas.toJSON());
      pushHistory();
    });

    fCanvas.add(editableText);
    fCanvas.setActiveObject(editableText);
    editableText.enterEditing();
    editableText.selectAll();

    setHoveredTextIndex(null);
  };

  return (
    <div className="flex-1 bg-muted/30 overflow-auto flex items-center justify-center p-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex flex-col items-center justify-center z-30">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Rendering Page {currentPage}...
          </p>
        </div>
      )}

      {pdfDocument ? (
        <div
          ref={containerRef}
          className="relative pdf-page-container bg-white select-none transition-all duration-200"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "center center",
          }}
        >
          {/* Background PDF canvas rendered by PDF.js */}
          <canvas ref={pdfCanvasRef} className="block" />

          {/* Interactive Fabric.js canvas overlay */}
          <canvas ref={fabricCanvasElRef} />

          {/* Direct Text Editing hover overlay layer (only active in edit-text mode) */}
          {activeTool === "edit-text" && !loading && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              {textItems.map((item, index) => (
                <div
                  key={index}
                  className={`absolute border cursor-text pointer-events-auto transition-colors ${
                    hoveredTextIndex === index
                      ? "border-primary bg-primary/10"
                      : "border-dashed border-primary/20 hover:border-primary/60"
                  }`}
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    width: `${item.width}px`,
                    height: `${item.height + 4}px`,
                  }}
                  onMouseEnter={() => setHoveredTextIndex(index)}
                  onMouseLeave={() => setHoveredTextIndex(null)}
                  onClick={() => handleTextItemClick(item)}
                  title="Click to edit this text"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 max-w-md bg-card border border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">No PDF Document Loaded</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload a PDF document to start viewing, editing, drawing, signing, and filling forms.
          </p>
        </div>
      )}
    </div>
  );
};
