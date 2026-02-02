import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface VectorChunk {
  chunkId: string;
  userId: string;
  sourceId: string; // noteId or documentId
  sourceType: 'note' | 'document'; // distinguish source type
  sourceTitle: string; // note title or document filename
  chunkIndex: number;
  content: string;
  vector: number[];
  updatedAt: number;
  // For documents only
  pageNumber?: number; // PDF page number
  fileName?: string; // original filename
  // denormalized field for indexing
  noteKey?: string;
}

interface VectorDBSchema extends DBSchema {
  chunks: {
    key: string; // chunkId
    value: VectorChunk;
    indexes: {
      userId: string;
      noteKey: string; // `${userId}::${noteId}`
      updatedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<VectorDBSchema>> | null = null;

export async function initVectorDB() {
  if (!dbPromise) {
    dbPromise = openDB<VectorDBSchema>("crossnotes-vectors", 1, {
      upgrade(db) {
        const store = db.createObjectStore("chunks", { keyPath: "chunkId" });
        store.createIndex("userId", "userId");
        store.createIndex("noteKey", "noteKey");
        store.createIndex("updatedAt", "updatedAt");
      },
    });
  }
  return dbPromise;
}

function sourceKey(userId: string, sourceId: string) {
  return `${userId}::${sourceId}`;
}

export async function upsertChunks(chunks: VectorChunk[]) {
  const db = await initVectorDB();
  const tx = db.transaction("chunks", "readwrite");
  for (const c of chunks) {
    // denormalize noteKey to index efficiently
    await tx.store.put({ ...c, noteKey: sourceKey(c.userId, c.sourceId) });
  }
  await tx.done;
}

export async function deleteChunksBySource(userId: string, sourceId: string) {
  const db = await initVectorDB();
  const tx = db.transaction("chunks", "readwrite");
  const idx = tx.store.index("noteKey");
  const key = sourceKey(userId, sourceId);

  let cursor = await idx.openCursor(key);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

// Backward compatibility alias
export const deleteChunksByNote = deleteChunksBySource;

export async function getChunksByUser(userId: string): Promise<VectorChunk[]> {
  const db = await initVectorDB();
  const idx = db.transaction("chunks").store.index("userId");
  return (await idx.getAll(userId)) as unknown as VectorChunk[];
}

export interface SimilarityResult extends VectorChunk {
  score: number;
}

export function cosineSimilarity(a: number[], b: number[]) {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchSimilar(
  userId: string,
  queryVector: number[],
  topK: number
): Promise<SimilarityResult[]> {
  const chunks = await getChunksByUser(userId);
  const scored = chunks
    .map((c) => ({ ...c, score: cosineSimilarity(queryVector, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return scored;
}
