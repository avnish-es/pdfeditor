import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Set worker source to the locally bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface TextItemInfo {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  transform: number[];
}

/**
 * Loads a PDF document from a File object
 */
export const loadPdfDocument = async (file: File): Promise<any> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return loadingTask.promise;
};

/**
 * Renders a specific page of a PDF onto a canvas
 */
export const renderPdfPage = async (
  pdfDoc: any,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.0,
  rotation: number = 0
): Promise<{ width: number; height: number; viewport: any }> => {
  const page = await pdfDoc.getPage(pageNum);
  
  // Calculate viewport with scale and rotation
  // PDF.js rotation is cumulative with the page's original rotation
  const originalRotation = page.rotate || 0;
  const totalRotation = (originalRotation + rotation) % 360;
  
  const viewport = page.getViewport({ scale, rotation: totalRotation });
  
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get 2D context from canvas");
  }
  
  // Set canvas dimensions
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderContext).promise;
  
  return {
    width: viewport.width,
    height: viewport.height,
    viewport,
  };
};

/**
 * Extracts text items with bounding boxes from a PDF page
 */
export const getPageTextItems = async (
  pdfDoc: any,
  pageNum: number,
  viewportScale: number = 1.0,
  rotation: number = 0
): Promise<TextItemInfo[]> => {
  const page = await pdfDoc.getPage(pageNum);
  const textContent = await page.getTextContent();
  
  const originalRotation = page.rotate || 0;
  const totalRotation = (originalRotation + rotation) % 360;
  
  // We need the viewport to convert PDF coordinates to canvas coordinates
  const viewport = page.getViewport({ scale: viewportScale, rotation: totalRotation });
  
  const items: TextItemInfo[] = textContent.items.map((item: any) => {
    // Transform matrix: [a, b, c, d, e, f]
    // e and f are the x and y coordinates in PDF space
    const tx = pdfjsLib.Util.transform(
      viewport.transform,
      item.transform
    );
    
    // Calculate size and coordinates in viewport space
    const fontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]) * viewportScale;
    
    // PDF.js coordinates start from bottom-left, but viewport starts from top-left.
    // The transformed matrix already handles this coordinate conversion.
    const x = tx[4];
    const y = tx[5] - fontSize; // Shift up because text baseline is at the bottom
    
    return {
      text: item.str,
      x,
      y,
      width: item.width * viewportScale,
      height: item.height * viewportScale,
      fontSize,
      fontFamily: item.fontName || "sans-serif",
      transform: item.transform,
    };
  });
  
  // Filter out empty spaces
  return items.filter((item) => item.text.trim().length > 0);
};
