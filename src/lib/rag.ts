import { generateEmbedding } from "@/lib/embeddings";
import { isAIFormattingConfigured } from "@/lib/deepseek";
import { answerWithGemini, isGeminiConfigured } from "@/lib/gemini";
import { generateLocalAnswer, isWebGPUAvailable } from "@/lib/local-llm";
import { fetchWikipediaSummary } from "@/lib/wiki";
import { searchSimilar, type SimilarityResult } from "@/lib/vectordb";

export interface RAGSource {
  sourceId: string; // noteId or documentId
  sourceType: 'note' | 'document';
  sourceTitle: string; // note title or document filename
  chunkId: string;
  snippet: string;
  score: number;
  pageNumber?: number; // for documents
}

export interface RAGAnswer {
  answer: string;
  sources: RAGSource[];
  used: "local" | "gemini" | "deepseek";
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
  const matches = new Map<string, { sourceId: string; sourceTitle: string; sourceType: 'note' | 'document'; lines: string[]; topScore: number; pageNumber?: number }>();

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

    const existing = matches.get(c.sourceId);
    if (!existing) {
      matches.set(c.sourceId, {
        sourceId: c.sourceId,
        sourceTitle: c.sourceTitle,
        sourceType: c.sourceType,
        lines: [hit],
        topScore: c.score,
        pageNumber: c.pageNumber
      });
    } else {
      existing.topScore = Math.max(existing.topScore, c.score);
      if (existing.lines.length < 2 && !existing.lines.includes(hit)) {
        existing.lines.push(hit);
      }
    }
  }

  return Array.from(matches.values()).sort((a, b) => b.topScore - a.topScore);
}

function formatMatchesSection(matches: Array<{ sourceTitle: string; sourceType: 'note' | 'document'; lines: string[]; pageNumber?: number }>) {
  if (!matches.length) return "";
  const top = matches.slice(0, 2);
  const lines: string[] = [];
  lines.push("From your knowledge base:");
  for (const m of top) {
    for (const l of m.lines.slice(0, 1)) {
      const icon = m.sourceType === 'document' ? '📄' : '📝';
      const pageInfo = m.pageNumber ? ` (Page ${m.pageNumber})` : '';
      lines.push(`- ${icon} \`${m.sourceTitle}${pageInfo}\`: ${l}`);
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
  const perSource = new Map<string, number>();

  for (const c of chunks) {
    if (c.score < opts.minScore) continue;

    const sourceCount = perSource.get(c.sourceId) ?? 0;
    const sourcesUsed = perSource.size;

    if (sourceCount === 0 && sourcesUsed >= opts.maxNotes) continue;
    if (sourceCount >= opts.maxChunksPerNote) continue;

    picked.push(c);
    perSource.set(c.sourceId, sourceCount + 1);
  }

  // If everything is below minScore, still return a few top chunks as a fallback.
  if (picked.length === 0) {
    return chunks.slice(0, Math.max(0, opts.fallbackChunks));
  }

  return picked;
}

function buildContext(chunks: SimilarityResult[], maxChars: number) {
  let out = "";

  // Group the retrieved chunks by source (note or document), so the model sees a document-level structure.
  const bySource = new Map<string, { sourceTitle: string; sourceType: 'note' | 'document'; chunks: SimilarityResult[] }>();
  for (const c of chunks) {
    const existing = bySource.get(c.sourceId);
    if (existing) {
      existing.chunks.push(c);
    } else {
      bySource.set(c.sourceId, { sourceTitle: c.sourceTitle, sourceType: c.sourceType, chunks: [c] });
    }
  }

  for (const source of bySource.values()) {
    const type = source.sourceType === 'document' ? 'DOCUMENT' : 'NOTE';
    const header = `=== ${type}: ${source.sourceTitle} ===\n`;
    if ((out + header).length > maxChars) break;
    out += header;

    for (const c of source.chunks) {
      const pageInfo = c.pageNumber ? `[Page ${c.pageNumber}] ` : '';
      const block = `${pageInfo}${c.content}\n\n---\n\n`;
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
    sourceId: r.sourceId,
    sourceType: r.sourceType,
    sourceTitle: r.sourceTitle,
    chunkId: r.chunkId,
    snippet: makeSnippet(r.content, keywords, 180),
    score: r.score,
    pageNumber: r.pageNumber,
  }));

  const noteMatches = hasNoteMatch ? collectNoteMatches(retrievedAll, keywords) : [];

  const buildInlineCitation = () => {
    if (!hasNoteMatch) return "";

    const sourceScores = new Map<string, { id: string; title: string; score: number; type: 'note' | 'document'; pageNumber?: number }>();
    for (const r of retrieved) {
      const prev = sourceScores.get(r.sourceTitle);
      if (!prev || r.score > prev.score) {
        sourceScores.set(r.sourceTitle, {
          id: r.sourceId,
          title: r.sourceTitle,
          score: r.score,
          type: r.sourceType,
          pageNumber: r.pageNumber
        });
      }
    }

    const citations = Array.from(sourceScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => {
        const icon = s.type === 'document' ? '📄' : '📝';
        const pageInfo = s.pageNumber ? ` (p.${s.pageNumber})` : '';
        // Markdown link format: [Title](/note/id)
        return `[${icon} ${s.title}${pageInfo}](/note/${s.id})`;
      });

    if (citations.length === 0) return "";
    return `References: ${citations.join(", ")}`;
  };

  const formatFinal = (answerLineRaw: string, general: string[], used: "local" | "gemini" | "deepseek") => {
    const answerLine = quoteIfShortEntity(answerLineRaw);
    const citation = buildInlineCitation();

    const parts: string[] = [];
    parts.push(answerLine);

    if (general.length) {
      parts.push("");
      parts.push(general.join("\n"));
    }

    if (citation) {
      parts.push("");
      parts.push(citation);
    }

    return { answer: parts.join("\n"), used };
  };

  // If we have note context, answer using notes (but allow general knowledge too).
  if (hasNoteMatch && context) {
    const system =
      "You are a helpful expert assistant. Answer the user's question concisely based on the notes. " +
      "Important: Add logically relevant detailed image references using markdown syntax or HTML <img> tags. " +
      "PRIORITIZE using real high-quality images from the internet (e.g., Unsplash: ![Alt](https://source.unsplash.com/featured/?<keywords>) or <img src=\"url\" alt=\"text\">). " +
      "Only if a specific real image cannot be found, use pollinations.ai as a fallback. " +
      "Use Mermaid flowcharts for complex processes: ```mermaid\ngraph TD\nA[Start] --> B[End]\n```. " +
      "Output format:\n" +
      "- Line 1: Direct, concise answer.\n" +
      "- Following lines: Bullet points with key details.\n" +
      "CRITICAL: Do not mention 'citations' in the text.";

    const userPrompt =
      `Question:\n${params.question}\n\n` +
      `Note excerpts:\n${context}`;

    // Use local LLM if explicitly preferred (Privacy Mode) OR if Gemini is not configured.
    if ((params.preferLocalLLM || !isGeminiConfigured()) && isWebGPUAvailable()) {
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

    if (isGeminiConfigured()) {
      const raw = await answerWithGemini({
        system,
        user: userPrompt,
        temperature: 0.1,
        max_tokens: 800,
      });

      const parsed = parseAnswerLines(raw);
      if (!parsed.isUnknown) {
        return { ...formatFinal(parsed.answerLine, parsed.general, "gemini"), sources };
      }
    }

    // If we somehow still got an unknown, fall back to Wikipedia to avoid a dead-end answer.
    const entity = stripQuestionToEntity(params.question) || params.question;
    const wiki = await fetchWikipediaSummary(entity);

    if (wiki && isGeminiConfigured()) {
      const webSystem =
        "You are an expert assistant. Use the provided Wikipedia summary to answer the question concisely. " +
        "Output format:\n" +
        "- Line 1: Direct concise answer.\n" +
        "- Following lines: 2-3 brief additional facts.\n" +
        "Do NOT mention Wikipedia or citations.";

      const webUser = `Question:\n${params.question}\n\nWikipedia summary:\n${wiki.extract}`;
      const raw = await answerWithGemini({ system: webSystem, user: webUser, temperature: 0.1, max_tokens: 800 });
      const parsed = parseAnswerLines(raw);
      if (!parsed.isUnknown) {
        return { ...formatFinal(parsed.answerLine, parsed.general, "gemini"), sources };
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

    const fallback = "I couldn't find anything relevant in your notes for that question.";
    return { answer: fallback, sources, used: "local" };
  }

  // No note match: use Wikipedia as a web fallback (and optionally ask the model to rewrite it).
  const entity = stripQuestionToEntity(params.question) || params.question;
  const wikiHint = keywords.length ? `${entity}` : entity;
  const wiki = await fetchWikipediaSummary(wikiHint);

  if (wiki && isGeminiConfigured()) {
    const system =
      "You are an expert assistant. Use the provided Wikipedia summary to answer accurately. " +
      "Output format:\n" +
      "- Line 1: Direct concise answer.\n" +
      "- Following lines: 2-3 brief additional facts.\n" +
      "Do NOT mention Wikipedia or citations.";

    const user = `Question:\n${params.question}\n\nWikipedia summary:\n${wiki.extract}`;
    const raw = await answerWithGemini({ system, user, temperature: 0.1, max_tokens: 800 });
    const parsed = parseAnswerLines(raw);
    if (!parsed.isUnknown) {
      return { ...formatFinal(parsed.answerLine, parsed.general, "gemini"), sources: [], used: "gemini" };
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

  // Final fallback: general answer via Gemini (no local context)
  if (isGeminiConfigured()) {
    const system =
      "You are a helpful expert assistant. Answer the user's question concisely. " +
      "Output format:\n" +
      "- Line 1: Direct concise answer.\n" +
      "- Following lines: 2-3 brief additional facts.";
    const raw = await answerWithGemini({ system, user: params.question, temperature: 0.2, max_tokens: 800 });
    const parsed = parseAnswerLines(raw);
    return {
      answer: formatFinal(parsed.answerLine || "", parsed.general, "gemini").answer,
      sources: [],
      used: "gemini"
    };
  }

  return { answer: "I couldn't find anything relevant in your notes for that question.", sources: [], used: "local" };
}
