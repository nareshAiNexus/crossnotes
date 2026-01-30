import { generateEmbedding } from "@/lib/embeddings";
import { searchSimilar, type SimilarityResult } from "@/lib/vectordb";
import { generateLocalAnswer, isWebGPUAvailable } from "@/lib/local-llm";
import { answerWithAI, isAIFormattingConfigured } from "@/lib/deepseek";

export interface RAGSource {
  noteId: string;
  noteTitle: string;
  chunkId: string;
  snippet: string;
  score: number;
}

export interface RAGAnswer {
  answer: string;
  sources: RAGSource[];
  used: "local" | "deepseek";
}

function pickRelevantChunks(
  chunks: SimilarityResult[],
  opts: {
    maxNotes: number;
    maxChunksPerNote: number;
    minScore: number;
    fallbackChunks: number;
  }
) {
  const picked: SimilarityResult[] = [];
  const perNote = new Map<string, number>();

  for (const c of chunks) {
    if (c.score < opts.minScore) continue;

    const noteCount = perNote.get(c.noteId) ?? 0;
    const notesUsed = perNote.size;

    if (noteCount === 0 && notesUsed >= opts.maxNotes) continue;
    if (noteCount >= opts.maxChunksPerNote) continue;

    picked.push(c);
    perNote.set(c.noteId, noteCount + 1);
  }

  // If everything is below minScore, still return a few top chunks as a fallback.
  if (picked.length === 0) {
    return chunks.slice(0, Math.max(0, opts.fallbackChunks));
  }

  return picked;
}

function buildContext(chunks: SimilarityResult[], maxChars: number) {
  let out = "";

  // Group the retrieved chunks by note, so the model sees a document-level structure.
  const byNote = new Map<string, { noteTitle: string; chunks: SimilarityResult[] }>();
  for (const c of chunks) {
    const existing = byNote.get(c.noteId);
    if (existing) {
      existing.chunks.push(c);
    } else {
      byNote.set(c.noteId, { noteTitle: c.noteTitle, chunks: [c] });
    }
  }

  for (const note of byNote.values()) {
    const header = `=== NOTE: ${note.noteTitle} ===\n`;
    if ((out + header).length > maxChars) break;
    out += header;

    for (const c of note.chunks) {
      const block = `${c.content}\n\n---\n\n`;
      if ((out + block).length > maxChars) break;
      out += block;
    }

    if (out.length >= maxChars) break;
  }

  return out.trim();
}

export async function askFromNotes(params: {
  userId: string;
  question: string;
  topK?: number;
  maxContextChars?: number;
  preferLocalLLM?: boolean;
  onLocalProgressText?: (t: string) => void;
  minScore?: number;
  minTopScore?: number;
  maxNotes?: number;
  maxChunksPerNote?: number;
}): Promise<RAGAnswer> {
  const topK = params.topK ?? 12;
  const maxContextChars = params.maxContextChars ?? 8000;
  const minScore = params.minScore ?? 0.18;
  const minTopScore = params.minTopScore ?? 0.12;
  const maxNotes = params.maxNotes ?? 4;
  const maxChunksPerNote = params.maxChunksPerNote ?? 2;

  const qVec = await generateEmbedding(params.question);
  const retrievedAll = await searchSimilar(params.userId, qVec, topK);
  const topScore = retrievedAll[0]?.score ?? 0;

  // If even the best match is weak, avoid producing a misleading answer.
  if (topScore < minTopScore) {
    return {
      answer: "I couldn't find anything relevant in your notes for that question.",
      sources: [],
      used: "local",
    };
  }

  const retrieved = pickRelevantChunks(retrievedAll, {
    maxNotes,
    maxChunksPerNote,
    minScore,
    fallbackChunks: 4,
  });

  const context = buildContext(retrieved, maxContextChars);

  const sources: RAGSource[] = retrieved.map((r) => ({
    noteId: r.noteId,
    noteTitle: r.noteTitle,
    chunkId: r.chunkId,
    snippet: r.content.slice(0, 180),
    score: r.score,
  }));

  if (!context) {
    return {
      answer: "I couldn't find anything relevant in your notes for that question.",
      sources: [],
      used: "local",
    };
  }

  const system =
    "You are a helpful assistant. Use the provided note excerpts to answer the user's question. " +
    "Output format: \n" +
    "- Line 1: ONLY the short final answer (no extra words).\n" +
    "- Lines 2-4: 2-3 short lines of general information about the answer (common knowledge).\n" +
    "Do NOT mention the notes, sources, excerpts, or citations in your output.\n" +
    "If the notes do not contain enough information to answer, output exactly: I don't know based on your notes.";

  const userPrompt =
    `Question:\n${params.question}\n\n` +
    `Note excerpts (may be partial):\n${context}`;

  const buildInlineCitation = () => {
    const noteScores = new Map<string, number>();
    for (const r of retrieved) {
      const prev = noteScores.get(r.noteTitle) ?? -Infinity;
      noteScores.set(r.noteTitle, Math.max(prev, r.score));
    }

    const noteTitles = Array.from(noteScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 2);

    if (noteTitles.length === 0) return "";
    return `according to your notes \`${noteTitles.join(", ")}\``;
  };

  const postProcess = (raw: string) => {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let answerLine = (lines[0] ?? raw).replace(/^answer\s*:\s*/i, "").trim();
    const isUnknown = /don't know based on your notes/i.test(answerLine);

    // Quote short entity-like answers to match the desired UI style.
    if (!isUnknown && answerLine.length <= 80 && !/^".*"$/.test(answerLine) && !/[.!?:;]/.test(answerLine)) {
      answerLine = `"${answerLine}"`;
    }

    if (isUnknown) {
      return answerLine;
    }

    const citation = buildInlineCitation();
    const general = lines.slice(1, 4);

    return [
      citation ? `${answerLine} ${citation}` : answerLine,
      general.length ? "" : null,
      general.length ? general.join("\n") : null,
    ]
      .filter((x): x is string => typeof x === "string")
      .join("\n");
  };

  // Prefer fully-local LLM if requested and WebGPU is available
  if (params.preferLocalLLM && isWebGPUAvailable()) {
    const raw = await generateLocalAnswer({
      system,
      user: userPrompt,
      onProgressText: params.onLocalProgressText,
      temperature: 0.2,
    });
    return { answer: postProcess(raw), sources, used: "local" };
  }

  // Fallback to DeepSeek/OpenRouter if configured
  if (isAIFormattingConfigured()) {
    const raw = await answerWithAI({
      system,
      user: userPrompt,
      temperature: 0.2,
      max_tokens: 1200,
    });
    return { answer: postProcess(raw), sources, used: "deepseek" };
  }

  return {
    answer:
      "RAG retrieval worked, but answering is not configured. Enable local LLM (WebGPU) or configure the AI API key.",
    sources,
    used: "local",
  };
}
