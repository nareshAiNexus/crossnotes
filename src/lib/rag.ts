import { generateEmbedding } from "@/lib/embeddings";
import { answerWithAI, isAIFormattingConfigured } from "@/lib/deepseek";
import { generateLocalAnswer, isWebGPUAvailable } from "@/lib/local-llm";
import { fetchWikipediaSummary } from "@/lib/wiki";
import { searchSimilar, type SimilarityResult } from "@/lib/vectordb";

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

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "define",
  "did",
  "do",
  "does",
  "explain",
  "from",
  "for",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "where",
  "who",
  "why",
  "you",
  "your",
]);

function extractKeywords(question: string): string[] {
  const raw = (question ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 3)
    .filter((t) => !STOPWORDS.has(t));

  return Array.from(new Set(raw)).slice(0, 6);
}

function makeSnippet(content: string, keywords: string[], maxLen = 180) {
  const text = (content ?? "").replace(/\r\n/g, "\n");

  const lower = text.toLowerCase();
  const idx = keywords
    .map((k) => lower.indexOf(k.toLowerCase()))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];

  if (typeof idx !== "number") {
    return text.slice(0, maxLen);
  }

  const start = Math.max(0, idx - Math.floor(maxLen * 0.45));
  const end = Math.min(text.length, start + maxLen);
  let out = text.slice(start, end).trim();
  if (start > 0) out = "…" + out;
  if (end < text.length) out = out + "…";
  return out;
}

function collectNoteMatches(chunks: SimilarityResult[], keywords: string[]) {
  const matches = new Map<string, { noteId: string; noteTitle: string; lines: string[]; topScore: number }>();

  const sentenceSplit = (s: string) =>
    s
      .replace(/\r\n/g, "\n")
      // avoid regex lookbehind for broader browser support
      .split(/(?:[.!?]\s+|\n+)/g)
      .map((x) => x.trim())
      .filter(Boolean);

  const hasKeyword = (s: string) => {
    const l = s.toLowerCase();
    return keywords.some((k) => l.includes(k));
  };

  for (const c of chunks) {
    const sents = sentenceSplit(c.content);
    const hit = sents.find(hasKeyword);
    if (!hit) continue;

    const existing = matches.get(c.noteId);
    if (!existing) {
      matches.set(c.noteId, { noteId: c.noteId, noteTitle: c.noteTitle, lines: [hit], topScore: c.score });
    } else {
      existing.topScore = Math.max(existing.topScore, c.score);
      if (existing.lines.length < 2 && !existing.lines.includes(hit)) {
        existing.lines.push(hit);
      }
    }
  }

  return Array.from(matches.values()).sort((a, b) => b.topScore - a.topScore);
}

function formatMatchesSection(matches: Array<{ noteTitle: string; lines: string[] }>) {
  if (!matches.length) return "";
  const top = matches.slice(0, 2);
  const lines: string[] = [];
  lines.push("From your notes:");
  for (const m of top) {
    for (const l of m.lines.slice(0, 1)) {
      lines.push(`- \`${m.noteTitle}\`: ${l}`);
    }
  }
  return lines.join("\n");
}

function stripQuestionToEntity(q: string) {
  return (q ?? "")
    .trim()
    .replace(/^\s*(who|what|where|when|why|how)\s+(is|are|was|were)\s+/i, "")
    .replace(/[?!.]+$/g, "")
    .trim();
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

function parseAnswerLines(raw: string) {
  const lines = (raw ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const answerLine = (lines[0] ?? raw ?? "").replace(/^answer\s*:\s*/i, "").trim();
  const general = lines.slice(1, 4);
  const isUnknown = /^(i\s+don'?t\s+know)\b/i.test(answerLine) || /don't know based on your notes/i.test(answerLine);

  return { answerLine, general, isUnknown };
}

function quoteIfShortEntity(s: string) {
  const t = s.trim();
  if (!t) return t;
  if (/^".*"$/.test(t)) return t;
  if (t.length <= 80 && !/[.!?:;]/.test(t)) return `"${t}"`;
  return t;
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

  const keywords = extractKeywords(params.question);

  const qVec = await generateEmbedding(params.question);
  const retrievedAll = await searchSimilar(params.userId, qVec, topK);
  const topScore = retrievedAll[0]?.score ?? 0;

  const hasNoteMatch = retrievedAll.length > 0 && topScore >= minTopScore;

  const retrieved = hasNoteMatch
    ? pickRelevantChunks(retrievedAll, {
        maxNotes,
        maxChunksPerNote,
        minScore,
        fallbackChunks: 4,
      })
    : [];

  const context = hasNoteMatch ? buildContext(retrieved, maxContextChars) : "";

  const sources: RAGSource[] = retrieved.map((r) => ({
    noteId: r.noteId,
    noteTitle: r.noteTitle,
    chunkId: r.chunkId,
    snippet: makeSnippet(r.content, keywords, 180),
    score: r.score,
  }));

  const noteMatches = hasNoteMatch ? collectNoteMatches(retrievedAll, keywords) : [];
  const matchesSection = formatMatchesSection(noteMatches);

  const buildInlineCitation = () => {
    if (!hasNoteMatch) return "";

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
    return `\`${noteTitles.join(", ")}\``;
  };

  const formatFinal = (answerLineRaw: string, general: string[], used: "local" | "deepseek") => {
    const answerLine = quoteIfShortEntity(answerLineRaw);
    const citation = buildInlineCitation();

    const parts: string[] = [];
    parts.push(citation ? `${answerLine} ${citation}` : answerLine);
    if (general.length) {
      parts.push("");
      parts.push(general.join("\n"));
    }
    if (matchesSection) {
      parts.push("");
      parts.push(matchesSection);
    }

    return { answer: parts.join("\n"), used };
  };

  // If we have note context, answer using notes (but allow general knowledge too).
  if (hasNoteMatch && context) {
    const system =
      "You are a helpful assistant. Use the provided note excerpts when they are relevant. " +
      "If the notes don't fully define the answer, you may use general knowledge to complete the response. " +
      "Output format:\n" +
      "- Line 1: ONLY the short final answer (no extra words).\n" +
      "- Lines 2-4: 2-3 short lines of general information.\n" +
      "Do NOT mention the notes, sources, excerpts, or citations in your output.";

    const userPrompt =
      `Question:\n${params.question}\n\n` +
      `Note excerpts (may be partial):\n${context}`;

    if (params.preferLocalLLM && isWebGPUAvailable()) {
      const raw = await generateLocalAnswer({
        system,
        user: userPrompt,
        onProgressText: params.onLocalProgressText,
        temperature: 0.2,
      });

      const parsed = parseAnswerLines(raw);
      if (!parsed.isUnknown) {
        return { ...formatFinal(parsed.answerLine, parsed.general, "local"), sources };
      }
    }

    if (isAIFormattingConfigured()) {
      const raw = await answerWithAI({
        system,
        user: userPrompt,
        temperature: 0.2,
        max_tokens: 1200,
      });

      const parsed = parseAnswerLines(raw);
      if (!parsed.isUnknown) {
        return { ...formatFinal(parsed.answerLine, parsed.general, "deepseek"), sources };
      }
    }

    // If we somehow still got an unknown, fall back to Wikipedia to avoid a dead-end answer.
    const entity = stripQuestionToEntity(params.question) || params.question;
    const wiki = await fetchWikipediaSummary(entity);

    if (wiki && isAIFormattingConfigured()) {
      const webSystem =
        "You are a helpful assistant. Use ONLY the provided Wikipedia summary to answer. " +
        "Output format:\n" +
        "- Line 1: ONLY the short final answer (no extra words).\n" +
        "- Lines 2-4: 2-3 short lines of general information.\n" +
        "Do NOT mention Wikipedia or add citations.";

      const webUser = `Question:\n${params.question}\n\nWikipedia summary:\n${wiki.extract}`;
      const raw = await answerWithAI({ system: webSystem, user: webUser, temperature: 0.2, max_tokens: 900 });
      const parsed = parseAnswerLines(raw);
      if (!parsed.isUnknown) {
        return { ...formatFinal(parsed.answerLine, parsed.general, "deepseek"), sources };
      }
    }

    if (wiki) {
      const lines = wiki.extract
        .split(/\r?\n/)
        .join(" ")
        .split(/(?:[.!?]\s+)/g)
        .filter(Boolean)
        .slice(0, 3);

      const answerLine = wiki.title;
      return { ...formatFinal(answerLine, lines, "local"), sources, used: "local" };
    }

    const fallback = matchesSection || "I couldn't find anything relevant in your notes for that question.";
    return { answer: fallback, sources, used: "local" };
  }

  // No note match: use Wikipedia as a web fallback (and optionally ask the model to rewrite it).
  const entity = stripQuestionToEntity(params.question) || params.question;
  const wikiHint = keywords.length ? `${entity}` : entity;
  const wiki = await fetchWikipediaSummary(wikiHint);

  if (wiki && isAIFormattingConfigured()) {
    const system =
      "You are a helpful assistant. Use ONLY the provided Wikipedia summary to answer. " +
      "Output format:\n" +
      "- Line 1: ONLY the short final answer (no extra words).\n" +
      "- Lines 2-4: 2-3 short lines of general information.\n" +
      "Do NOT mention Wikipedia or add citations.";

    const user = `Question:\n${params.question}\n\nWikipedia summary:\n${wiki.extract}`;
    const raw = await answerWithAI({ system, user, temperature: 0.2, max_tokens: 900 });
    const parsed = parseAnswerLines(raw);
    if (!parsed.isUnknown) {
      return { ...formatFinal(parsed.answerLine, parsed.general, "deepseek"), sources: [], used: "deepseek" };
    }
  }

  if (wiki) {
    // No model configured or model refused; return a minimal response from Wikipedia directly.
    const title = wiki.title;
    const lines = wiki.extract
      .split(/\r?\n/)
      .join(" ")
      .split(/(?:[.!?]\s+)/g)
      .filter(Boolean)
      .slice(0, 3);
    return { answer: [quoteIfShortEntity(title), "", ...lines].join("\n"), sources: [], used: "local" };
  }

  // Final fallback: general answer via model (no citations).
  if (isAIFormattingConfigured()) {
    const system =
      "You are a helpful assistant. Answer the user's question. " +
      "Output format:\n" +
      "- Line 1: ONLY the short final answer (no extra words).\n" +
      "- Lines 2-4: 2-3 short lines of general information.";
    const raw = await answerWithAI({ system, user: params.question, temperature: 0.2, max_tokens: 900 });
    const parsed = parseAnswerLines(raw);
    return { answer: formatFinal(parsed.answerLine || "", parsed.general, "deepseek").answer, sources: [], used: "deepseek" };
  }

  return { answer: "I couldn't find anything relevant in your notes for that question.", sources: [], used: "local" };
}
