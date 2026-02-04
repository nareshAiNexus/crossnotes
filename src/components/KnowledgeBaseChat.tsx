import { useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, Database, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/hooks/useNotes";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useIsMobile } from "@/hooks/use-mobile";
import { askFromNotes } from "@/lib/rag";
import { isWebGPUAvailable } from "@/lib/local-llm";
import { useNoteNavigation } from "@/hooks/useNoteNavigation";

type ChatMsg =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      sources?: { noteId: string; noteTitle: string; highlightPhrases: string[] }[];
      used?: string;
    };

function ThinkingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "140ms" }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "280ms" }} />
      </div>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </div>
  );
}

export default function KnowledgeBaseChat() {
  const { user } = useAuth();
  const { notes } = useNotes();
  const isMobile = useIsMobile();

  // Mobile optimization: fewer/smaller chunks => fewer embeddings => less CPU/RAM.
  const kb = useKnowledgeBase({
    userId: user?.uid ?? null,
    notes,
    chunking: isMobile ? { targetChars: 2200, overlapChars: 120 } : undefined,
  });
  const { openNote } = useNoteNavigation();

  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);

  // Mobile optimization: default to remote (local WebGPU models are heavy and can freeze phones).
  const [preferLocal, setPreferLocal] = useState(() => !isMobile);
  const [localProgress, setLocalProgress] = useState<string | null>(null);

  // Throttle local progress updates to avoid excessive re-renders on slower devices.
  const lastProgressAtRef = useRef(0);
  const pendingProgressRef = useRef<string | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const webgpu = useMemo(() => isWebGPUAvailable(), []);
  const canAsk = kb.status === "ready" && !!user;

  // Mobile optimization: never allow local LLM toggle on mobile (too heavy).
  const canUseLocal = webgpu && !isMobile;

  const send = async () => {
    const q = question.trim();
    if (!q || !user) return;

    setQuestion("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    setLocalProgress(null);

    try {
      const throttledProgress = (t: string) => {
        const now = Date.now();
        pendingProgressRef.current = t;

        // immediate update at most every 250ms
        if (now - lastProgressAtRef.current > 250) {
          lastProgressAtRef.current = now;
          setLocalProgress(t);
          return;
        }

        if (progressTimerRef.current != null) return;
        progressTimerRef.current = window.setTimeout(() => {
          progressTimerRef.current = null;
          lastProgressAtRef.current = Date.now();
          if (pendingProgressRef.current) setLocalProgress(pendingProgressRef.current);
        }, 250);
      };

      const res = await askFromNotes({
        userId: user.uid,
        question: q,
        // Mobile optimization: still keep this smaller than desktop, but not so small that retrieval quality collapses.
        topK: isMobile ? 8 : 12,
        maxContextChars: isMobile ? 6000 : 8000,
        // Mobile: loosen thresholds so we don't incorrectly say "not found" due to fewer chunks / shorter context.
        minTopScore: isMobile ? 0.06 : undefined,
        minScore: isMobile ? 0.12 : undefined,
        preferLocalLLM: preferLocal && !isMobile,
        onLocalProgressText: throttledProgress,
      });

      const normalizeSnippetToPhrase = (snippet: string) => {
        const cleaned = snippet
          .replace(/^#\s+.*?(\r?\n\r?\n)/, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!cleaned) return "";
        return cleaned.split(" ").slice(0, 10).join(" ").trim();
      };

      // Group & dedupe sources per noteId, and carry a few highlight phrases.
      const grouped = new Map<string, { noteId: string; noteTitle: string; highlightPhrases: string[]; topScore: number }>();
      for (const s of res.sources) {
        const existing = grouped.get(s.noteId);
        const phrase = normalizeSnippetToPhrase(s.snippet);

        if (!existing) {
          grouped.set(s.noteId, {
            noteId: s.noteId,
            noteTitle: s.noteTitle,
            highlightPhrases: phrase ? [phrase] : [],
            topScore: s.score,
          });
        } else {
          existing.topScore = Math.max(existing.topScore, s.score);
          if (phrase && existing.highlightPhrases.length < 4 && !existing.highlightPhrases.includes(phrase)) {
            existing.highlightPhrases.push(phrase);
          }
        }
      }

      const sources = Array.from(grouped.values())
        .sort((a, b) => b.topScore - a.topScore)
        .map(({ topScore, ...rest }) => rest);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
          used: res.used,
          sources,
        },
      ]);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
      setLocalProgress(null);
    }
  };

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg",
          "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
        )}
        size="icon"
        title="Knowledge Base Chat"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-md">
          <div className="flex h-full flex-col">
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Knowledge Base
              </SheetTitle>
              <SheetDescription>
                Ask questions. Answers are grounded in your notes.
              </SheetDescription>

              {/* Controls */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => kb.indexAllNotes()}
                  disabled={!kb.canIndex || kb.status === "downloading_model" || kb.status === "indexing"}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Index notes
                </Button>

                <Button
                  variant={preferLocal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreferLocal((v) => !v)}
                  disabled={!canUseLocal}
                  title={
                    isMobile
                      ? "Local LLM is disabled on mobile for performance"
                      : !webgpu
                        ? "WebGPU not available (local LLM disabled)"
                        : "Toggle local LLM"
                  }
                >
                  <Cpu className="h-4 w-4 mr-2" />
                  Local LLM
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessages([])}
                  disabled={messages.length === 0}
                >
                  Clear
                </Button>
              </div>

              {/* Status */}
              <div className="mt-2 text-xs text-muted-foreground">
                {kb.status === "idle" && "Not indexed yet. Click “Index notes” to start."}
                {kb.status === "downloading_model" &&
                  `Downloading model… ${Math.round((kb.progress.downloadRatio ?? 0) * 100)}%`}
                {kb.status === "indexing" &&
                  `Indexing… ${kb.progress.indexedNotes ?? 0}/${kb.progress.totalNotes ?? 0}`}
                {kb.status === "ready" && "Ready."}
                {kb.status === "error" && `Error: ${kb.error}`}
                {localProgress && <div className="mt-1">{localProgress}</div>}
              </div>
            </SheetHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Try: “Summarize my note about X” or “What did I write about Y?”
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={cn("rounded-lg p-3", m.role === "user" ? "bg-muted" : "bg-card")}> 
                    <div className="text-xs text-muted-foreground mb-1">
                      {m.role === "user" ? "You" : `Assistant${(m as any).used ? ` (${(m as any).used})` : ""}`}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>

                    {m.role === "assistant" && (m as any).sources?.length > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Sources</div>
                        <div className="space-y-2">
                          {(m as any).sources.map((s: any, j: number) => (
                            <div key={j} className="text-xs">
                              <button
                                type="button"
                                className="font-medium underline underline-offset-2 hover:text-primary"
                                onClick={() => {
                                  openNote(s.noteId, {
                                    view: "preview",
                                    highlightPhrases: Array.isArray(s.highlightPhrases) ? s.highlightPhrases : [],
                                  });
                                  setOpen(false);
                                }}
                                title="Open note"
                              >
                                {s.noteTitle}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Thinking bubble */}
                {loading && (
                  <div className={cn("rounded-lg p-3 bg-card")}> 
                    <div className="text-xs text-muted-foreground mb-1">
                      Assistant{preferLocal && !isMobile ? " (local)" : ""}
                    </div>
                    {/* Mobile optimization: avoid bounce animation */}
                    {isMobile ? (
                      <div className="text-xs text-muted-foreground animate-pulse">Thinking…</div>
                    ) : (
                      <ThinkingIndicator label={localProgress ?? "Thinking…"} />
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={canAsk ? "Ask a question…" : "Index notes first…"}
                  disabled={!canAsk || loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                />
                <Button
                  onClick={send}
                  disabled={!canAsk || loading || !question.trim()}
                  size="icon"
                  title="Send"
                >
                  <Send className={cn("h-4 w-4", loading && "opacity-50")} />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}


// Sample