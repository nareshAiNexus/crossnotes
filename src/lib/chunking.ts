export interface NoteLike {
  id: string;
  title: string;
  content: string;
  updatedAt?: number;
}

export interface NoteChunk {
  chunkId: string;
  noteId: string;
  noteTitle: string;
  chunkIndex: number;
  content: string;
}

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
}

const DEFAULT_TARGET_CHARS = 1200;
const DEFAULT_OVERLAP_CHARS = 200;

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

/**
 * Simple chunking:
 * - split by blank lines (paragraphs)
 * - merge paragraphs until we reach a target size
 * - add a small overlap to improve recall
 */
export function chunkNote(
  note: NoteLike,
  opts?: { targetChars?: number; overlapChars?: number }
): NoteChunk[] {
  const targetChars = opts?.targetChars ?? DEFAULT_TARGET_CHARS;
  const overlapChars = opts?.overlapChars ?? DEFAULT_OVERLAP_CHARS;

  const raw = normalizeText(note.content || "");
  if (!raw) {
    return [];
  }

  const paragraphs = raw.split(/\n\s*\n+/g).map((p) => p.trim()).filter(Boolean);

  const chunks: NoteChunk[] = [];
  let buffer = "";
  let idx = 0;

  const flush = () => {
    const content = buffer.trim();
    if (!content) return;

    chunks.push({
      chunkId: `${note.id}::${idx}`,
      noteId: note.id,
      noteTitle: note.title,
      chunkIndex: idx,
      content: `# ${note.title}\n\n${content}`,
    });
    idx += 1;
  };

  for (const p of paragraphs) {
    if (!buffer) {
      buffer = p;
      continue;
    }

    const candidate = `${buffer}\n\n${p}`;

    if (candidate.length <= targetChars) {
      buffer = candidate;
      continue;
    }

    // flush current chunk
    flush();

    // overlap tail of previous chunk into next
    const overlap = buffer.slice(Math.max(0, buffer.length - overlapChars));
    buffer = overlap ? `${overlap}\n\n${p}` : p;
  }

  flush();
  return chunks;
}

/**
 * Chunk a document (PDF) by pages
 * Each page's text is chunked separately to preserve page numbers for citations
 */
export function chunkDocument(
  document: { id: string; fileName: string; pages: Array<{ pageNumber: number; text: string }> },
  opts?: { targetChars?: number; overlapChars?: number }
): DocumentChunk[] {
  const targetChars = opts?.targetChars ?? DEFAULT_TARGET_CHARS;
  const overlapChars = opts?.overlapChars ?? DEFAULT_OVERLAP_CHARS;

  const allChunks: DocumentChunk[] = [];
  let globalIdx = 0;

  for (const page of document.pages) {
    const raw = normalizeText(page.text);
    if (!raw) continue;

    const paragraphs = raw.split(/\n\s*\n+/g).map((p) => p.trim()).filter(Boolean);

    let buffer = "";

    const flush = () => {
      const content = buffer.trim();
      if (!content) return;

      allChunks.push({
        chunkId: `${document.id}::${globalIdx}`,
        documentId: document.id,
        fileName: document.fileName,
        chunkIndex: globalIdx,
        content: `# ${document.fileName} (Page ${page.pageNumber})\n\n${content}`,
        pageNumber: page.pageNumber,
      });
      globalIdx += 1;
    };

    for (const p of paragraphs) {
      if (!buffer) {
        buffer = p;
        continue;
      }

      const candidate = `${buffer}\n\n${p}`;

      if (candidate.length <= targetChars) {
        buffer = candidate;
        continue;
      }

      flush();

      // For documents, we use smaller overlap to avoid cross-page confusion
      const overlap = buffer.slice(Math.max(0, buffer.length - overlapChars));
      buffer = overlap ? `${overlap}\n\n${p}` : p;
    }

    flush();
  }

  return allChunks;
}
