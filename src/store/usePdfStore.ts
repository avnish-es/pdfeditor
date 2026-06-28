import { create } from "zustand";

export type ToolType =
  | "select"
  | "edit-text"
  | "add-text"
  | "draw"
  | "highlight"
  | "underline"
  | "strikethrough"
  | "shape"
  | "redact"
  | "sign"
  | "form"
  | "sticky-note";

export type ShapeType = "rect" | "circle" | "line" | "arrow";

interface CanvasState {
  objects: any[];
  background?: string;
}

interface PdfStore {
  // Document state
  pdfFile: File | null;
  pdfUrl: string | null;
  pdfDocument: any | null; // PDFDocumentProxy from pdf.js
  numPages: number;
  currentPage: number;
  zoom: number;
  rotation: number; // 0, 90, 180, 270

  // Active Tool state
  activeTool: ToolType;
  selectedShape: ShapeType | null;
  drawColor: string;
  drawWidth: number;
  fillColor: string;
  textFontSize: number;
  textFontFamily: string;
  isBold: boolean;
  isItalic: boolean;

  // Multi-page Canvas States
  canvasStates: { [pageNumber: number]: CanvasState };
  
  // Selection / Property state
  selectedObject: any | null;
  selectedObjectProperties: {
    text?: string;
    fontSize?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    underline?: boolean;
    linethrough?: boolean;
    opacity?: number;
  } | null;

  // History (Undo/Redo)
  undoStack: Array<{ [pageNumber: number]: CanvasState }>;
  redoStack: Array<{ [pageNumber: number]: CanvasState }>;

  // UI state
  isDarkMode: boolean;
  sidebarTab: "edit" | "annotate" | "pages" | "forms" | "sign" | "advanced" | "security";
  isCompareMode: boolean;
  comparePdfFile: File | null;

  // Actions
  setPdfFile: (file: File | null) => void;
  setPdfDocument: (pdfDoc: any) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setRotation: (rotation: number) => void;
  setActiveTool: (tool: ToolType) => void;
  setSelectedShape: (shape: ShapeType | null) => void;
  setDrawColor: (color: string) => void;
  setDrawWidth: (width: number) => void;
  setFillColor: (color: string) => void;
  setTextFontSize: (size: number) => void;
  setTextFontFamily: (family: string) => void;
  setIsBold: (isBold: boolean) => void;
  setIsItalic: (isItalic: boolean) => void;
  
  // Canvas State Actions
  saveCanvasState: (pageNumber: number, state: CanvasState) => void;
  setSelectedObject: (obj: any | null) => void;
  updateSelectedObjectProperties: (properties: any) => void;

  // History Actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // UI Actions
  toggleDarkMode: () => void;
  setSidebarTab: (tab: "edit" | "annotate" | "pages" | "forms" | "sign" | "advanced" | "security") => void;
  setCompareMode: (enabled: boolean) => void;
  setComparePdfFile: (file: File | null) => void;
  
  // Reset
  resetStore: () => void;
}

const initialStates = {
  pdfFile: null,
  pdfUrl: null,
  pdfDocument: null,
  numPages: 0,
  currentPage: 1,
  zoom: 1.0,
  rotation: 0,
  activeTool: "select" as ToolType,
  selectedShape: null as ShapeType | null,
  drawColor: "#1e3a8a", // Default dark blue
  drawWidth: 3,
  fillColor: "transparent",
  textFontSize: 16,
  textFontFamily: "Inter",
  isBold: false,
  isItalic: false,
  canvasStates: {},
  selectedObject: null,
  selectedObjectProperties: null,
  undoStack: [],
  redoStack: [],
  sidebarTab: "edit" as const,
  isCompareMode: false,
  comparePdfFile: null,
};

export const usePdfStore = create<PdfStore>((set, get) => ({
  ...initialStates,
  isDarkMode: true, // Default to dark mode for premium look

  setPdfFile: (file) => {
    // Revoke old URL if exists
    const currentUrl = get().pdfUrl;
    if (currentUrl) URL.revokeObjectURL(currentUrl);

    if (!file) {
      set({ ...initialStates });
      return;
    }

    const url = URL.createObjectURL(file);
    set({
      ...initialStates,
      pdfFile: file,
      pdfUrl: url,
    });
  },

  setPdfDocument: (pdfDoc) => {
    set({
      pdfDocument: pdfDoc,
      numPages: pdfDoc.numPages,
      currentPage: 1,
    });
  },

  setCurrentPage: (page) => {
    const { numPages } = get();
    if (page >= 1 && page <= numPages) {
      set({ currentPage: page, selectedObject: null, selectedObjectProperties: null });
    }
  },

  setZoom: (zoom) => {
    // Constrain zoom between 0.5 and 4.0
    const constrainedZoom = Math.max(0.5, Math.min(4.0, zoom));
    set({ zoom: constrainedZoom });
  },

  setRotation: (rotation) => {
    set({ rotation: rotation % 360 });
  },

  setActiveTool: (tool) => {
    set({ activeTool: tool, selectedObject: null, selectedObjectProperties: null });
  },

  setSelectedShape: (shape) => {
    set({ selectedShape: shape });
  },

  setDrawColor: (color) => {
    set({ drawColor: color });
  },

  setDrawWidth: (width) => {
    set({ drawWidth: width });
  },

  setFillColor: (color) => {
    set({ fillColor: color });
  },

  setTextFontSize: (size) => {
    set({ textFontSize: size });
  },

  setTextFontFamily: (family) => {
    set({ textFontFamily: family });
  },

  setIsBold: (isBold) => {
    set({ isBold });
  },

  setIsItalic: (isItalic) => {
    set({ isItalic });
  },

  saveCanvasState: (pageNumber, state) => {
    set((store) => ({
      canvasStates: {
        ...store.canvasStates,
        [pageNumber]: state,
      },
    }));
  },

  setSelectedObject: (obj) => {
    if (!obj) {
      set({ selectedObject: null, selectedObjectProperties: null });
      return;
    }

    // Extract relevant properties to bind to UI controls
    const props: any = {
      fill: obj.fill,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      opacity: obj.opacity,
    };

    if (obj.type === "i-text" || obj.type === "textbox" || obj.type === "text") {
      props.text = obj.text;
      props.fontSize = obj.fontSize;
      props.fontFamily = obj.fontFamily;
      props.fontWeight = obj.fontWeight;
      props.fontStyle = obj.fontStyle;
      props.underline = obj.underline;
      props.linethrough = obj.linethrough;
    }

    set({
      selectedObject: obj,
      selectedObjectProperties: props,
    });
  },

  updateSelectedObjectProperties: (properties) => {
    const { selectedObject, selectedObjectProperties } = get();
    if (!selectedObject) return;

    // Update fabric object directly
    selectedObject.set(properties);
    if (selectedObject.canvas) {
      selectedObject.canvas.requestRenderAll();
      // Trigger state save
      const activePage = get().currentPage;
      const json = selectedObject.canvas.toJSON();
      get().saveCanvasState(activePage, json);
    }

    set({
      selectedObjectProperties: {
        ...selectedObjectProperties,
        ...properties,
      },
    });
  },

  pushHistory: () => {
    const { canvasStates, undoStack } = get();
    // Deep clone canvas states for history
    const clone = JSON.parse(JSON.stringify(canvasStates));
    
    // Limit stack size to 30
    const newUndoStack = [...undoStack, clone].slice(-30);
    
    set({
      undoStack: newUndoStack,
      redoStack: [], // Clear redo on new action
    });
  },

  undo: () => {
    const { undoStack, redoStack, canvasStates } = get();
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    
    // Clone current state for redo
    const currentClone = JSON.parse(JSON.stringify(canvasStates));
    const newRedoStack = [...redoStack, currentClone];

    set({
      canvasStates: previousState,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      selectedObject: null,
      selectedObjectProperties: null,
    });
  },

  redo: () => {
    const { undoStack, redoStack, canvasStates } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Clone current state for undo
    const currentClone = JSON.parse(JSON.stringify(canvasStates));
    const newUndoStack = [...undoStack, currentClone];

    set({
      canvasStates: nextState,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      selectedObject: null,
      selectedObjectProperties: null,
    });
  },

  toggleDarkMode: () => {
    set((store) => {
      const nextMode = !store.isDarkMode;
      if (nextMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { isDarkMode: nextMode };
    });
  },

  setSidebarTab: (tab) => {
    set({ sidebarTab: tab });
  },

  setCompareMode: (enabled) => {
    set({ isCompareMode: enabled });
  },

  setComparePdfFile: (file) => {
    set({ comparePdfFile: file });
  },

  resetStore: () => {
    const currentUrl = get().pdfUrl;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    set({ ...initialStates, isDarkMode: get().isDarkMode });
  },
}));
