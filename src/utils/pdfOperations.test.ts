import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  deletePages,
  insertBlankPage,
  rotatePage,
  extractPages,
  mergePdfs,
  splitPdf,
  addWatermarkText,
  encryptPdf,
  applyBatesNumbering,
} from "./pdfOperations";

// Helper to create a dummy PDF with N pages
const createDummyPdf = async (numPages: number): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < numPages; i++) {
    const page = pdfDoc.addPage([600, 800]);
    page.drawText(`Page ${i + 1}`);
  }
  return await pdfDoc.save();
};

// Helper to convert Uint8Array to File
const bytesToFile = (bytes: Uint8Array, name: string): File => {
  return new File([bytes as any], name, { type: "application/pdf" });
};

describe("pdfOperations Utility", () => {
  it("should insert a blank page", async () => {
    const pdfBytes = await createDummyPdf(1);
    
    // Insert blank page at index 1 (after page 1)
    const resultBytes = await insertBlankPage(pdfBytes, 1);
    
    const resultDoc = await PDFDocument.load(resultBytes);
    expect(resultDoc.getPageCount()).toBe(2);
  });

  it("should delete pages from PDF", async () => {
    const pdfBytes = await createDummyPdf(3);
    
    // Delete page 2 (index 1)
    const resultBytes = await deletePages(pdfBytes, [1]);
    
    const resultDoc = await PDFDocument.load(resultBytes);
    expect(resultDoc.getPageCount()).toBe(2);
  });

  it("should rotate a page", async () => {
    const pdfBytes = await createDummyPdf(1);
    
    // Rotate page 1 by 90 degrees
    const resultBytes = await rotatePage(pdfBytes, 0, 90);
    
    const resultDoc = await PDFDocument.load(resultBytes);
    const page = resultDoc.getPage(0);
    expect(page.getRotation().angle).toBe(90);
  });

  it("should extract pages as a new PDF", async () => {
    const pdfBytes = await createDummyPdf(3);
    
    // Extract pages 1 and 3 (indices 0 and 2)
    const resultBytes = await extractPages(pdfBytes, [0, 2]);
    
    const resultDoc = await PDFDocument.load(resultBytes);
    expect(resultDoc.getPageCount()).toBe(2);
  });

  it("should merge multiple PDFs", async () => {
    const pdfBytes1 = await createDummyPdf(1);
    const pdfBytes2 = await createDummyPdf(2);
    
    const file1 = bytesToFile(pdfBytes1, "file1.pdf");
    const file2 = bytesToFile(pdfBytes2, "file2.pdf");
    
    const resultBytes = await mergePdfs([file1, file2]);
    const resultDoc = await PDFDocument.load(resultBytes);
    
    expect(resultDoc.getPageCount()).toBe(3);
  });

  it("should split PDF by page ranges", async () => {
    const pdfBytes = await createDummyPdf(4);
    
    // Split into range: "1-2, 3-4"
    const results = await splitPdf(pdfBytes, "1-2, 3-4");
    
    expect(results.length).toBe(2);
    
    const doc1 = await PDFDocument.load(results[0].bytes);
    const doc2 = await PDFDocument.load(results[1].bytes);
    
    expect(doc1.getPageCount()).toBe(2);
    expect(doc2.getPageCount()).toBe(2);
  });

  it("should add a watermark to PDF pages", async () => {
    const pdfBytes = await createDummyPdf(2);
    
    const resultBytes = await addWatermarkText(pdfBytes, "CONFIDENTIAL", {
      color: "#ff0000",
      fontSize: 40,
      opacity: 0.2,
      rotation: 45,
    });
    
    const resultDoc = await PDFDocument.load(resultBytes);
    expect(resultDoc.getPageCount()).toBe(2);
    // Verification passes if pdf-lib completes drawing text without throwing
  });

  it("should password protect / encrypt PDF", async () => {
    const pdfBytes = await createDummyPdf(1);
    
    const encryptedBytes = await encryptPdf(pdfBytes, "userpass", "ownerpass");
    
    // Load the PDF to verify it remains valid
    const doc = await PDFDocument.load(encryptedBytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("should apply Bates numbering to all pages", async () => {
    const pdfBytes = await createDummyPdf(3);
    
    const resultBytes = await applyBatesNumbering(pdfBytes, {
      prefix: "BATES-",
      suffix: "-LAW",
      startNumber: 10,
      paddingLength: 4,
      position: "bottomCenter",
      fontSize: 12,
      color: "#0000ff",
    });
    
    const resultDoc = await PDFDocument.load(resultBytes);
    expect(resultDoc.getPageCount()).toBe(3);
  });
});
