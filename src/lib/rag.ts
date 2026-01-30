import { generateEmbedding } from "@/lib/embeddings";
import { searchSimilar, type SimilarityResult } from "@/lib/vectordb";
import { generateLocalAnswer, isWebGPUAvailable } from "@/lib/local-llm";
import { formatNotesWithAI, isAIFormattingConfigured } from "@/lib/deepseek";

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

function buildContext(chunks: SimilarityResult[], maxChars: number) {
  let out = "";
  for (const c of chunks) {
    const block = `[#${c.noteTitle}]\n${c.content}\n\n---\n\n`;
    if ((out + block).length > maxChars) break;
    out += block;
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
}): Promise<RAGAnswer> {
  const topK = params.topK ?? 5;
  const maxContextChars = params.maxContextChars ?? 8000;

  const qVec = await generateEmbedding(params.question);
  const retrieved = await searchSimilar(params.userId, qVec, topK);
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

  // Prefer fully-local LLM if requested and WebGPU is available
  if (params.preferLocalLLM && isWebGPUAvailable()) {
    const answer = await generateLocalAnswer({
      question: params.question,
      context,
      onProgressText: params.onLocalProgressText,
    });
    return { answer, sources, used: "local" };
  }

  // Fallback to DeepSeek/OpenRouter if configured
  if (isAIFormattingConfigured()) {
    const system =
      "You are a helpful assistant. Answer the user ONLY using the provided context from their notes. " +
      "If the context does not contain the answer, say you don't know based on the notes.";

    const prompt = `${system}\n\nContext from notes:\n${context}\n\nUser question: ${params.question}`;

    // NOTE: this reuses the same transport as formatting, but with a different prompt.
    const answer = await formatNotesWithAI(prompt);
    return { answer, sources, used: "deepseek" };
  }

  return {
    answer:
      "RAG retrieval worked, but answering is not configured. Enable local LLM (WebGPU) or configure the AI API key.",
    sources,
    used: "local",
  };
}
