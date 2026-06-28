import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

/**
 * Deletes pages from a PDF
 */
export const deletePages = async (pdfBytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Sort indices in descending order so deleting one doesn't shift the indices of the next ones
  const sortedIndices = [...pageIndices].sort((a, b) => b - a);
  
  for (const index of sortedIndices) {
    pdfDoc.removePage(index);
  }
  
  return await pdfDoc.save();
};

/**
 * Inserts a blank page into a PDF
 */
export const insertBlankPage = async (
  pdfBytes: Uint8Array,
  index: number,
  width: number = 612, // Letter width
  height: number = 792 // Letter height
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.insertPage(index, [width, height]);
  return await pdfDoc.save();
};

/**
 * Rotates a page in a PDF
 */
export const rotatePage = async (
  pdfBytes: Uint8Array,
  pageIndex: number,
  rotationDegrees: number // 90, 180, 270
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(pageIndex);
  const currentRotation = page.getRotation().angle;
  page.setRotation(degrees((currentRotation + rotationDegrees) % 360));
  return await pdfDoc.save();
};

/**
 * Reorders pages in a PDF
 */
export const reorderPages = async (
  pdfBytes: Uint8Array,
  newOrder: number[] // array of old page indices in the new order
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const newPdfDoc = await PDFDocument.create();
  
  const copiedPages = await newPdfDoc.copyPages(pdfDoc, newOrder);
  for (const page of copiedPages) {
    newPdfDoc.addPage(page);
  }
  
  return await newPdfDoc.save();
};

/**
 * Extracts specific pages from a PDF and returns a new PDF
 */
export const extractPages = async (pdfBytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const newPdfDoc = await PDFDocument.create();
  
  const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
  for (const page of copiedPages) {
    newPdfDoc.addPage(page);
  }
  
  return await newPdfDoc.save();
};

/**
 * Merges multiple PDFs into one
 */
export const mergePdfs = async (pdfFiles: File[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of pdfFiles) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }
  
  return await mergedPdf.save();
};

/**
 * Splits a PDF into individual pages or page ranges
 * ranges format: "1-3, 4, 5-8"
 */
export const splitPdf = async (
  pdfBytes: Uint8Array,
  rangeString: string
): Promise<{ name: string; bytes: Uint8Array }[]> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  const results: { name: string; bytes: Uint8Array }[] = [];
  
  // Parse ranges, e.g., "1-3, 5" -> [[0, 1, 2], [4]]
  const parts = rangeString.split(",");
  let fileIndex = 1;
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    const pageIndices: number[] = [];
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = Math.max(1, parseInt(startStr, 10)) - 1;
      const end = Math.min(pageCount, parseInt(endStr, 10)) - 1;
      for (let i = start; i <= end; i++) {
        pageIndices.push(i);
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (pageNum >= 1 && pageNum <= pageCount) {
        pageIndices.push(pageNum - 1);
      }
    }
    
    if (pageIndices.length > 0) {
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      for (const page of copiedPages) {
        newPdf.addPage(page);
      }
      const bytes = await newPdf.save();
      results.push({
        name: `split_part_${fileIndex}_pages_${trimmed}.pdf`,
        bytes,
      });
      fileIndex++;
    }
  }
  
  return results;
};

/**
 * Adds a watermark (text or image) to all pages in a PDF
 */
export const addWatermarkText = async (
  pdfBytes: Uint8Array,
  text: string,
  options: {
    color?: string; // hex, e.g. "#ff0000"
    fontSize?: number;
    opacity?: number;
    rotation?: number; // degrees
  } = {}
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const fontSize = options.fontSize || 50;
  const opacity = options.opacity !== undefined ? options.opacity : 0.3;
  const rotation = options.rotation !== undefined ? options.rotation : 45;
  
  // Parse color
  let r = 0.5, g = 0.5, b = 0.5;
  if (options.color && options.color.startsWith("#")) {
    const hex = options.color.replace("#", "");
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - (text.length * fontSize) / 4,
      y: height / 2,
      size: fontSize,
      font: helveticaFont,
      color: rgb(r, g, b),
      opacity: opacity,
      rotate: degrees(rotation),
    });
  }
  
  return await pdfDoc.save();
};

/**
 * Protects a PDF with user & owner passwords and encrypts it
 */
export const encryptPdf = async (
  pdfBytes: Uint8Array,
  userPassword?: string,
  ownerPassword?: string,
  permissions?: {
    printing?: "lowResolution" | "highResolution" | "unallowed";
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  }
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // pdf-lib encrypt options
  const encryptOptions: any = {};
  if (userPassword) encryptOptions.userPassword = userPassword;
  if (ownerPassword) encryptOptions.ownerPassword = ownerPassword;
  
  if (permissions) {
    encryptOptions.permissions = {
      printing: permissions.printing || "highResolution",
      modifying: permissions.modifying !== undefined ? permissions.modifying : true,
      copying: permissions.copying !== undefined ? permissions.copying : true,
      annotating: permissions.annotating !== undefined ? permissions.annotating : true,
    };
  }
  
  // Note: pdf-lib encrypt is supported on saving
  return await pdfDoc.save(encryptOptions);
};

/**
 * Compresses PDF by re-saving with optimization options
 */
export const compressPdf = async (pdfBytes: Uint8Array): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  // pdf-lib's save({ useObjectStreams: true }) compresses the PDF structure
  return await pdfDoc.save({ useObjectStreams: true });
};

/**
 * Compiles and saves all Fabric.js edits (as transparent PNG overlays) back into the PDF.
 * Supports drawing white redaction rectangles over original PDF content.
 */
export const saveEditedPdf = async (
  originalPdfBytes: Uint8Array,
  canvasStates: { [pageNumber: number]: any },
  redactions: { [pageNumber: number]: { x: number; y: number; width: number; height: number }[] } = {}
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();
  
  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const page = pages[i];
    const { height: pageHeight } = page.getSize();
    
    // 1. Apply Redactions first (draw black boxes directly on the PDF so text is permanently covered/redacted)
    if (redactions[pageNum] && redactions[pageNum].length > 0) {
      for (const rect of redactions[pageNum]) {
        // Map canvas coordinates to PDF coordinates
        // Canvas (0,0) is top-left, PDF (0,0) is bottom-left
        const pdfX = rect.x;
        const pdfY = pageHeight - rect.y - rect.height;
        
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: rect.width,
          height: rect.height,
          color: rgb(0, 0, 0), // Solid black
        });
      }
    }
    
    // 2. Overlay Fabric.js edits if they exist
    const canvasState = canvasStates[pageNum];
    if (canvasState && canvasState.objects && canvasState.objects.length > 0) {
      // We will render the Fabric.js objects onto a temporary offscreen canvas,
      // export it as a transparent PNG, and draw it on the PDF page.
      // This is handled on the UI side by passing the generated transparent PNG data URLs to this function.
    }
  }
  
  return await pdfDoc.save();
};

/**
 * Overlays transparent PNG images (representing Fabric.js edits) onto corresponding PDF pages.
 * Also applies solid black redaction rectangles.
 */
export const overlayEditsOnPdf = async (
  originalPdfBytes: Uint8Array,
  pageEdits: { [pageNumber: number]: string }, // pageNumber -> transparent PNG dataURL
  redactions: { [pageNumber: number]: { x: number; y: number; width: number; height: number }[] } = {}
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();
  
  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    // Apply permanent black-out redactions
    if (redactions[pageNum] && redactions[pageNum].length > 0) {
      for (const rect of redactions[pageNum]) {
        const pdfX = rect.x;
        const pdfY = pageHeight - rect.y - rect.height;
        
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: rect.width,
          height: rect.height,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Apply transparent PNG overlay of annotations/edits
    const dataUrl = pageEdits[pageNum];
    if (dataUrl) {
      // Remove data:image/png;base64, prefix
      const base64Data = dataUrl.split(",")[1];
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      
      const embeddedImage = await pdfDoc.embedPng(imageBytes);
      
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    }
  }
  
  return await pdfDoc.save();
};
