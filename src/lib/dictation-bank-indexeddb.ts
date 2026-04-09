const DB_NAME = "ep-dictation-bank-db";
const STORE_NAME = "kv";
const BANK_KEY = "fullBankJson";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open dictation bank DB"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const out = await run(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Dictation bank IDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("Dictation bank IDB transaction aborted"));
    });
    return out;
  } finally {
    db.close();
  }
}

/** Full dictation bank JSON (same shape as localStorage value). */
export async function saveDictationBankJson(json: string): Promise<void> {
  const trimmed = json.trim();
  if (!trimmed) return;
  await withStore("readwrite", async (store) => {
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ key: BANK_KEY, value: trimmed });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to save dictation bank"));
    });
  });
}

export async function loadDictationBankJson(): Promise<string | null> {
  return withStore("readonly", async (store) => {
    return new Promise<string | null>((resolve, reject) => {
      const req = store.get(BANK_KEY);
      req.onsuccess = () => {
        const row = req.result as { value?: string } | undefined;
        const v = row?.value;
        resolve(typeof v === "string" && v.trim() ? v : null);
      };
      req.onerror = () => reject(req.error ?? new Error("Failed to load dictation bank"));
    });
  });
}

export async function clearDictationBankJson(): Promise<void> {
  await withStore("readwrite", async (store) => {
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(BANK_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to clear dictation bank"));
    });
  });
}
