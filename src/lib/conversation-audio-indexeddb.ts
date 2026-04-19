const DB_NAME = "ep-conversation-audio-db";
const STORE_NAME = "audioByKey";
const DB_VERSION = 1;

type Row = {
  key: string;
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
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open conversation audio DB"));
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

/** Stable key for one generated clip (matches admin + hydration). */
export function conversationAudioKey(
  examId: string,
  part: "scenario" | { kind: "sq"; index: number } | { kind: "mt"; index: number },
): string {
  const id = examId.trim();
  if (part === "scenario") return `${id}::scenario`;
  if (part.kind === "sq") return `${id}::sq::${part.index}`;
  return `${id}::mt::${part.index}`;
}

export async function putConversationAudioByKey(args: {
  key: string;
  audioBase64: string;
  mimeType?: string;
}): Promise<void> {
  const key = args.key.trim();
  const audioBase64 = args.audioBase64.trim();
  if (!key || !audioBase64) return;
  const mimeType = args.mimeType?.trim() || "audio/mpeg";
  await withStore("readwrite", async (store) => {
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ key, audioBase64, mimeType } satisfies Row);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to write conversation audio"));
    });
  });
}

export async function getConversationAudioDataUrlByKey(keyRaw: string): Promise<string | null> {
  const key = keyRaw.trim();
  if (!key) return null;
  return withStore("readonly", async (store) => {
    const row = await new Promise<Row | null>((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as Row | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("Failed to read conversation audio"));
    });
    if (!row?.audioBase64?.trim()) return null;
    if (row.audioBase64.startsWith("data:audio/")) return row.audioBase64;
    const mimeType = row.mimeType?.trim() || "audio/mpeg";
    return `data:${mimeType};base64,${row.audioBase64}`;
  });
}

/** Wipe all generated conversation audio clips (admin TTS) for this browser. */
export function deleteConversationAudioDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Failed to delete conversation audio DB"));
    req.onblocked = () => resolve();
  });
}

export async function deleteConversationAudioByKey(keyRaw: string): Promise<void> {
  const key = keyRaw.trim();
  if (!key) return;
  await withStore("readwrite", async (store) => {
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to delete conversation audio"));
    });
  });
}

/** Deletes all IndexedDB clips whose keys start with `examId::` (scenario + MCQ lines). */
export async function deleteConversationAudioKeysForExamId(examId: string): Promise<void> {
  const id = examId.trim();
  if (!id) return;
  const prefix = `${id}::`;
  await withStore("readwrite", async (store) => {
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result as IDBValidKey[]);
      req.onerror = () => reject(req.error ?? new Error("Failed to list conversation audio keys"));
    });
    for (const k of keys) {
      if (String(k).startsWith(prefix)) {
        await new Promise<void>((resolve, reject) => {
          const del = store.delete(k);
          del.onsuccess = () => resolve();
          del.onerror = () => reject(del.error ?? new Error("Failed to delete conversation audio key"));
        });
      }
    }
  });
}
