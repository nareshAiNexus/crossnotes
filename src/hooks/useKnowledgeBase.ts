import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Note } from "@/hooks/useNotes";
import { chunkNote } from "@/lib/chunking";
import { initEmbedder, generateEmbedding } from "@/lib/embeddings";
import { deleteChunksByNote, upsertChunks, type VectorChunk } from "@/lib/vectordb";

export type KBStatus =
  | "idle"
  | "downloading_model"
  | "indexing"
  | "ready"
  | "error";

export interface KBProgress {
  stage: "download" | "index" | "idle";
  downloadRatio?: number; // 0..1
  indexedNotes?: number;
  totalNotes?: number;
  message?: string;
}

export function useKnowledgeBase(params: {
  userId: string | null;
  notes: Note[];
  chunking?: { targetChars?: number; overlapChars?: number };
}) {
  const [status, setStatus] = useState<KBStatus>("idle");
  const [progress, setProgress] = useState<KBProgress>({ stage: "idle" });
  const [error, setError] = useState<string | null>(null);

  const lastIndexedAtRef = useRef<Map<string, number>>(new Map());
  const indexingRef = useRef(false);

  const indexNote = useCallback(
    async (note: Note) => {
      if (!params.userId) return;
      const userId = params.userId;

      // remove old chunks for note (simple approach)
      await deleteChunksByNote(userId, note.id);

      const chunks = chunkNote(
        { id: note.id, title: note.title, content: note.content },
        params.chunking
      );
      if (chunks.length === 0) return;

      const vectors: number[][] = [];
      for (const c of chunks) {
        // Embed sequentially to keep UI responsive on low-end devices
        // (we can batch later)
        vectors.push(await generateEmbedding(c.content));
      }

      const now = Date.now();
      const toStore: VectorChunk[] = chunks.map((c, i) => ({
        chunkId: c.chunkId,
        userId,
        sourceId: c.noteId,
        sourceType: 'note' as const,
        sourceTitle: c.noteTitle,
        chunkIndex: c.chunkIndex,
        content: c.content,
        vector: vectors[i],
        updatedAt: note.updatedAt ?? now,
      }));


      await upsertChunks(toStore);
      lastIndexedAtRef.current.set(note.id, note.updatedAt ?? now);
    },
    [params.userId, params.chunking]
  );

  const indexAllNotes = useCallback(
    async () => {
      if (!params.userId) return;
      if (indexingRef.current) return;
      indexingRef.current = true;

      setError(null);
      setStatus("downloading_model");
      setProgress({ stage: "download", downloadRatio: 0, message: "Downloading embedding model…" });

      try {
        await initEmbedder((ratio) => {
          setProgress((p) => ({ ...p, stage: "download", downloadRatio: ratio }));
        });

        setStatus("indexing");
        setProgress({ stage: "index", indexedNotes: 0, totalNotes: params.notes.length });

        let indexed = 0;
        for (const note of params.notes) {
          await indexNote(note);
          indexed += 1;
          setProgress({ stage: "index", indexedNotes: indexed, totalNotes: params.notes.length });
        }

        setStatus("ready");
        setProgress({ stage: "idle" });
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus("error");
        setProgress({ stage: "idle" });
      } finally {
        indexingRef.current = false;
      }
    },
    [params.userId, params.notes, indexNote]
  );

  // Incremental indexing when notes change.
  useEffect(() => {
    if (!params.userId) return;
    if (params.notes.length === 0) return;

    // Only attempt incremental updates if we are already ready.
    if (status !== "ready") return;

    const needs = params.notes.filter((n) => {
      const last = lastIndexedAtRef.current.get(n.id);
      const updated = n.updatedAt ?? 0;
      return !last || updated > last;
    });

    if (needs.length === 0) return;

    // Fire-and-forget incremental (avoid racing full indexing)
    (async () => {
      try {
        for (const n of needs) {
          await indexNote(n);
        }
      } catch {
        // keep silent; user can re-index from UI
      }
    })();
  }, [params.userId, params.notes, indexNote, status]);

  const canIndex = useMemo(() => !!params.userId && params.notes.length > 0, [params.userId, params.notes.length]);

  return {
    status,
    progress,
    error,
    canIndex,
    indexAllNotes,
    indexNote,
  };
}
