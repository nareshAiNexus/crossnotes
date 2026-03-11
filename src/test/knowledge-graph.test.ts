import { describe, expect, it } from 'vitest';
import { buildKnowledgeGraph } from '@/lib/knowledge-graph';
import type { Note } from '@/hooks/useNotes';

function note(id: string, title: string, content: string): Note {
  const now = Date.now();
  return { id, title, content, folderId: null, createdAt: now, updatedAt: now };
}

describe('buildKnowledgeGraph', () => {
  it('creates edges for related notes', () => {
    const notes = [
      note('1', 'React Performance', 'optimize react rendering with memo and hooks'),
      note('2', 'React Hooks', 'hooks like useMemo and useCallback improve rendering'),
      note('3', 'Travel Plan', 'book hotels and flights for summer trip'),
    ];

    const graph = buildKnowledgeGraph(notes, 0.1);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    expect(graph.edges.some((e) => e.source === '1' && e.target === '2')).toBe(true);
  });

  it('returns no edges for disjoint notes', () => {
    const notes = [
      note('1', 'Gardening', 'soil compost watering plants'),
      note('2', 'Astronomy', 'galaxy telescope stars orbiting planets'),
    ];

    const graph = buildKnowledgeGraph(notes, 0.2);
    expect(graph.edges).toHaveLength(0);
    expect(graph.nodes).toHaveLength(2);
  });
});
