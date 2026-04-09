const DB_NAME = "ep-dictation-audio-db";
const STORE_NAME = "audioByItemId";
const DB_VERSION = 1;

type DictationAudioRow = {
  id: string;
  audioBase64: string;
  mimeType: string;
};

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
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
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
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
    return out;
  } finally {
    db.close();
  }
}

export async function putDictationAudioByItemId(args: {
  id: string;
  audioBase64: string;
  mimeType?: string;
}): Promise<void> {
  const id = args.id.trim();
  const audioBase64 = args.audioBase64.trim();
  if (!id || !audioBase64) return;
  const mimeType = args.mimeType?.trim() || "audio/mpeg";
  await withStore("readwrite", async (store) => {
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ id, audioBase64, mimeType } satisfies DictationAudioRow);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to write dictation audio"));
    });
  });
}

export async function getDictationAudioDataUrlByItemId(idRaw: string): Promise<string | null> {
  const id = idRaw.trim();
  if (!id) return null;
  return withStore("readonly", async (store) => {
    const row = await new Promise<DictationAudioRow | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const v = req.result as DictationAudioRow | undefined;
        resolve(v ?? null);
      };
      req.onerror = () => reject(req.error ?? new Error("Failed to read dictation audio"));
    });
    if (!row?.audioBase64?.trim()) return null;
    if (row.audioBase64.startsWith("data:audio/")) return row.audioBase64;
    const mimeType = row.mimeType?.trim() || "audio/mpeg";
    return `data:${mimeType};base64,${row.audioBase64}`;
  });
}

export async function deleteDictationAudioByItemId(idRaw: string): Promise<void> {
  const id = idRaw.trim();
  if (!id) return;
  await withStore("readwrite", async (store) => {
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to delete dictation audio"));
    });
  });
}

export async function clearAllDictationAudioInIndexedDb(): Promise<void> {
  await withStore("readwrite", async (store) => {
    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to clear dictation audio store"));
    });
  });
}

