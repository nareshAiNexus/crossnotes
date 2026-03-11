import { useMemo } from 'react';
import { Network, Link2 } from 'lucide-react';
import type { Note } from '@/hooks/useNotes';
import { buildKnowledgeGraph } from '@/lib/knowledge-graph';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface KnowledgeGraphDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  onOpenNote: (noteId: string) => void;
}

type PositionedNode = {
  id: string;
  label: string;
  degree: number;
  x: number;
  y: number;
};

export default function KnowledgeGraphDialog({
  open,
  onOpenChange,
  notes,
  onOpenNote,
}: KnowledgeGraphDialogProps) {
  const graph = useMemo(() => buildKnowledgeGraph(notes), [notes]);

  const { nodes, edgeByPair } = useMemo(() => {
    const width = 760;
    const height = 460;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.36;

    const positionedNodes: PositionedNode[] = graph.nodes
      .slice()
      .sort((a, b) => b.degree - a.degree)
      .map((node, index, arr) => {
        const angle = (2 * Math.PI * index) / Math.max(1, arr.length);
        const level = node.degree > 0 ? 1 : 0.7;
        return {
          ...node,
          x: cx + Math.cos(angle) * radius * level,
          y: cy + Math.sin(angle) * radius * level,
        };
      });

    const nodeMap = new Map(positionedNodes.map((n) => [n.id, n]));
    const edgeMap = graph.edges.map((edge) => ({
      ...edge,
      from: nodeMap.get(edge.source),
      to: nodeMap.get(edge.target),
    }));

    return { nodes: positionedNodes, edgeByPair: edgeMap };
  }, [graph.edges, graph.nodes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Knowledge Graph
          </DialogTitle>
          <DialogDescription>
            Visual map of related notes based on shared key terms. Click a note node to open it.
          </DialogDescription>
        </DialogHeader>

        {nodes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">Create some notes to generate your graph.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-card p-2 overflow-auto">
              <svg viewBox="0 0 760 460" className="w-full min-w-[640px]">
                {edgeByPair.map((edge) => {
                  if (!edge.from || !edge.to) return null;
                  return (
                    <g key={`${edge.source}-${edge.target}`}>
                      <line
                        x1={edge.from.x}
                        y1={edge.from.y}
                        x2={edge.to.x}
                        y2={edge.to.y}
                        stroke="hsl(var(--muted-foreground))"
                        opacity={Math.max(0.25, edge.weight * 1.7)}
                        strokeWidth={Math.max(1, edge.weight * 8)}
                      />
                      {edge.sharedTerms.length > 0 && (
                        <title>{`Shared: ${edge.sharedTerms.join(', ')}`}</title>
                      )}
                    </g>
                  );
                })}

                {nodes.map((node) => {
                  const size = 14 + Math.min(node.degree, 8) * 2;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenNote(node.id);
                      }}
                    >
                      <circle
                        r={size}
                        className={cn(
                          'fill-primary/90 stroke-background transition-all',
                          'hover:fill-primary'
                        )}
                        strokeWidth={2}
                      />
                      <text
                        y={size + 16}
                        textAnchor="middle"
                        className="fill-foreground text-[11px]"
                      >
                        {node.label.length > 24 ? `${node.label.slice(0, 24)}…` : node.label}
                      </text>
                      <title>{`${node.label} • ${node.degree} connection${node.degree === 1 ? '' : 's'}`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              {graph.edges.length} links across {graph.nodes.length} notes
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
