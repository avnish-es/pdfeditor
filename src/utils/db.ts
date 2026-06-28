const DB_NAME = "ProPdfEditorDB";
const STORE_NAME = "SessionStore";
const DB_VERSION = 1;

export const initDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveSession = async (
  pdfFile: File | null,
  canvasStates: any,
  currentPage: number
): Promise<void> => {
  try {
    const db = await initDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    if (pdfFile) {
      store.put(pdfFile, "pdfFile");
    } else {
      store.delete("pdfFile");
    }
    
    store.put(canvasStates, "canvasStates");
    store.put(currentPage, "currentPage");
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to save session to IndexedDB:", err);
  }
};

export const loadSession = async (): Promise<{
  pdfFile: File | null;
  canvasStates: any;
  currentPage: number;
} | null> => {
  try {
    const db = await initDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    
    const pdfFileReq = store.get("pdfFile");
    const canvasStatesReq = store.get("canvasStates");
    const currentPageReq = store.get("currentPage");
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    return {
      pdfFile: pdfFileReq.result || null,
      canvasStates: canvasStatesReq.result || {},
      currentPage: currentPageReq.result || 1,
    };
  } catch (err) {
    console.error("Failed to load session from IndexedDB:", err);
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    const db = await initDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {
    console.error("Failed to clear session from IndexedDB:", err);
  }
};
