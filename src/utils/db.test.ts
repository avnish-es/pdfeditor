import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, loadSession, saveSession } from "./db";

type StoredValue = Record<string, unknown>;

class FakeObjectStore {
  constructor(
    private readonly storage: Map<string, StoredValue>,
    private readonly complete: () => void
  ) {}

  put(value: unknown, key: string) {
    this.storage.set(key, value as StoredValue);
    queueMicrotask(this.complete);
  }

  delete(key: string) {
    this.storage.delete(key);
    queueMicrotask(this.complete);
  }

  clear() {
    this.storage.clear();
    queueMicrotask(this.complete);
  }

  get(key: string) {
    return { result: this.storage.get(key) };
  }
}

class FakeTransaction {
  public oncomplete: (() => void) | null = null;
  public onerror: ((event: unknown) => void) | null = null;

  constructor(private readonly storage: Map<string, StoredValue>) {
    queueMicrotask(() => this.oncomplete?.());
  }

  objectStore() {
    return new FakeObjectStore(this.storage, () => this.oncomplete?.());
  }
}

class FakeDatabase {
  public readonly objectStoreNames = { contains: () => true };

  constructor(private readonly storage: Map<string, StoredValue>) {}

  createObjectStore() {
    return new FakeObjectStore(this.storage, () => undefined);
  }

  transaction() {
    return new FakeTransaction(this.storage);
  }
}

function createIndexedDbMock() {
  const storage = new Map<string, StoredValue>();
  const db = new FakeDatabase(storage);

  const indexedDb = {
    open: vi.fn(() => {
      const request: {
        result: FakeDatabase;
        error: null;
        onupgradeneeded: null | (() => void);
        onsuccess: null | (() => void);
        onerror: null | (() => void);
      } = {
        result: db,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });

      return request;
    }),
  };

  return { indexedDb, storage };
}

describe("db session persistence", () => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalFile = globalThis.File;
  let indexedDb: ReturnType<typeof createIndexedDbMock>["indexedDb"];

  beforeEach(() => {
    ({ indexedDb } = createIndexedDbMock());
    globalThis.indexedDB = indexedDb as unknown as IDBFactory;
  });

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDb;
    globalThis.File = originalFile;
    vi.restoreAllMocks();
  });

  it("saves and loads the session state, including outline data", async () => {
    const pdfFile = new File(["pdf"], "sample.pdf", { type: "application/pdf" });
    const canvasStates = { 1: { objects: 2 } };
    const pageLabels = { 1: "Cover", 2: "Summary" };
    const bookmarks = [{ id: "bm-1", title: "Intro", pageNumber: 1 }];

    await saveSession(pdfFile, canvasStates, 2, pageLabels, bookmarks);

    const session = await loadSession();

    expect(session).not.toBeNull();
    expect(session?.pdfFile?.name).toBe("sample.pdf");
    expect(session?.canvasStates).toEqual(canvasStates);
    expect(session?.currentPage).toBe(2);
    expect(session?.pageLabels).toEqual(pageLabels);
    expect(session?.bookmarks).toEqual(bookmarks);
  });

  it("loads safe defaults when outline fields are missing", async () => {
    await saveSession(null, {}, 1);

    const session = await loadSession();

    expect(session).not.toBeNull();
    expect(session?.pageLabels).toEqual({});
    expect(session?.bookmarks).toEqual([]);
    expect(session?.pdfFile).toBeNull();
  });

  it("clears the saved session", async () => {
    const pdfFile = new File(["pdf"], "sample.pdf", { type: "application/pdf" });
    await saveSession(pdfFile, { 1: {} }, 1, { 1: "Cover" }, [{ id: "bm-1", title: "Intro", pageNumber: 1 }]);

    await clearSession();
    const session = await loadSession();

    expect(session).not.toBeNull();
    expect(session?.pdfFile).toBeNull();
    expect(session?.canvasStates).toEqual({});
    expect(session?.currentPage).toBe(1);
    expect(session?.pageLabels).toEqual({});
    expect(session?.bookmarks).toEqual([]);
  });
});
