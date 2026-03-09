import type { Note } from '@/hooks/useNotes';

export interface KnowledgeNode {
  id: string;
  label: string;
  degree: number;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  weight: number;
  sharedTerms: string[];
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'your', 'you', 'are', 'was', 'were', 'not', 'but', 'all',
  'any', 'can', 'our', 'out', 'get', 'what', 'when', 'where', 'who', 'how', 'why', 'about', 'into', 'over', 'under',
  'there', 'their', 'then', 'than', 'them', 'they', 'its', 'his', 'her', 'she', 'him', 'has', 'had', 'will', 'would',
  'should', 'could', 'also', 'been', 'being', 'just', 'more', 'most', 'some', 'such', 'very', 'like', 'only', 'each',
  'make', 'made', 'many', 'much', 'use', 'using', 'used', 'via', 'per', 'new', 'note', 'notes'
]);

function tokenize(text: string) {
  return (text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((t) => !STOP_WORDS.has(t));
}

function topTerms(text: string, maxTerms = 24): Set<string> {
  const terms = tokenize(text);
  const freq = new Map<string, number>();

  for (const term of terms) {
    freq.set(term, (freq.get(term) ?? 0) + 1);
  }

  const ranked = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([term]) => term);

  return new Set(ranked);
}

function jaccardScore(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection += 1;
  }

  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function buildKnowledgeGraph(notes: Note[], minScore = 0.12): KnowledgeGraphData {
  if (notes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const termsByNote = new Map<string, Set<string>>();
  for (const note of notes) {
    termsByNote.set(note.id, topTerms(`${note.title}\n${note.content}`));
  }

  const edges: KnowledgeEdge[] = [];
  const degree = new Map<string, number>();

  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      const left = notes[i];
      const right = notes[j];
      const leftTerms = termsByNote.get(left.id) ?? new Set<string>();
      const rightTerms = termsByNote.get(right.id) ?? new Set<string>();
      const score = jaccardScore(leftTerms, rightTerms);

      if (score < minScore) continue;

      const sharedTerms: string[] = [];
      for (const term of leftTerms) {
        if (rightTerms.has(term)) sharedTerms.push(term);
      }

      edges.push({
        source: left.id,
        target: right.id,
        weight: Number(score.toFixed(3)),
        sharedTerms: sharedTerms.slice(0, 6),
      });

      degree.set(left.id, (degree.get(left.id) ?? 0) + 1);
      degree.set(right.id, (degree.get(right.id) ?? 0) + 1);
    }
  }

  const nodes: KnowledgeNode[] = notes.map((note) => ({
    id: note.id,
    label: note.title?.trim() || 'Untitled',
    degree: degree.get(note.id) ?? 0,
  }));

  return { nodes, edges };
}
