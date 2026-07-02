import { describe, it, expect, beforeEach } from "vitest";
import { usePdfStore } from "./usePdfStore";

describe("usePdfStore Zustand Store", () => {
  beforeEach(() => {
    // Reset store before each test
    usePdfStore.getState().resetStore();
  });

  it("should initialize with default values", () => {
    const state = usePdfStore.getState();
    expect(state.pdfFile).toBeNull();
    expect(state.currentPage).toBe(1);
    expect(state.zoom).toBe(1.0);
    expect(state.rotation).toBe(0);
    expect(state.activeTool).toBe("select");
    expect(state.undoStack).toEqual([]);
    expect(state.redoStack).toEqual([]);
    expect(state.pageLabels).toEqual({});
    expect(state.bookmarks).toEqual([]);
  });

  it("should set PDF file and generate URL", () => {
    const file = new File(["dummy pdf content"], "test.pdf", { type: "application/pdf" });
    usePdfStore.getState().setPdfFile(file);

    const state = usePdfStore.getState();
    expect(state.pdfFile).toBe(file);
    expect(state.pdfUrl).toBeTypeOf("string");
  });

  it("should change current page within bounds", () => {
    // Manually set numPages to 5
    usePdfStore.setState({ numPages: 5 });

    usePdfStore.getState().setCurrentPage(3);
    expect(usePdfStore.getState().currentPage).toBe(3);

    // Out of bounds - should not change
    usePdfStore.getState().setCurrentPage(6);
    expect(usePdfStore.getState().currentPage).toBe(3);

    usePdfStore.getState().setCurrentPage(0);
    expect(usePdfStore.getState().currentPage).toBe(3);
  });

  it("should constrain zoom level between 0.5 and 4.0", () => {
    usePdfStore.getState().setZoom(2.5);
    expect(usePdfStore.getState().zoom).toBe(2.5);

    // Below min zoom
    usePdfStore.getState().setZoom(0.2);
    expect(usePdfStore.getState().zoom).toBe(0.5);

    // Above max zoom
    usePdfStore.getState().setZoom(5.0);
    expect(usePdfStore.getState().zoom).toBe(4.0);
  });

  it("should handle Undo/Redo stack history", () => {
    const store = usePdfStore.getState();

    // 1. Initial state
    expect(store.undoStack.length).toBe(0);

    // 2. Perform action 1 on Page 1
    usePdfStore.getState().saveCanvasState(1, { objects: [{ type: "rect", left: 10 }] });
    usePdfStore.getState().pushHistory();

    // 3. Perform action 2 on Page 1
    usePdfStore.getState().saveCanvasState(1, { objects: [{ type: "rect", left: 20 }] });
    usePdfStore.getState().pushHistory();

    expect(usePdfStore.getState().undoStack.length).toBe(2);
    expect(usePdfStore.getState().redoStack.length).toBe(0);

    // 4. Undo
    usePdfStore.getState().undo();
    expect(usePdfStore.getState().undoStack.length).toBe(1);
    expect(usePdfStore.getState().redoStack.length).toBe(1);

    // 5. Redo
    usePdfStore.getState().redo();
    expect(usePdfStore.getState().undoStack.length).toBe(2);
    expect(usePdfStore.getState().redoStack.length).toBe(0);
  });

  it("should manage page labels and bookmarks", () => {
    usePdfStore.getState().setPageLabel(2, "Executive Summary");
    expect(usePdfStore.getState().pageLabels[2]).toBe("Executive Summary");

    usePdfStore.getState().clearPageLabel(2);
    expect(usePdfStore.getState().pageLabels[2]).toBeUndefined();

    usePdfStore.getState().addBookmark("Section 1", 3);
    const firstBookmark = usePdfStore.getState().bookmarks[0];
    expect(firstBookmark.title).toBe("Section 1");
    expect(firstBookmark.pageNumber).toBe(3);

    usePdfStore.getState().updateBookmark(firstBookmark.id, "Updated Section");
    expect(usePdfStore.getState().bookmarks[0].title).toBe("Updated Section");

    usePdfStore.getState().removeBookmark(firstBookmark.id);
    expect(usePdfStore.getState().bookmarks).toEqual([]);
  });
});
