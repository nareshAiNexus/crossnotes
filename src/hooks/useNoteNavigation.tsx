import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type NoteView = "preview" | "editor";

export interface NoteViewRequest {
  view: NoteView;
  nonce: number;
}

export interface NoteHighlightRequest {
  noteId: string;
  phrases: string[];
  nonce: number;
}

interface NoteNavigationContextValue {
  selectedNoteId: string | null;
  openNote: (noteId: string | null, opts?: { view?: NoteView; highlightPhrases?: string[] }) => void;
  viewRequest: NoteViewRequest | null;
  highlightRequest: NoteHighlightRequest | null;
}

const NoteNavigationContext = createContext<NoteNavigationContextValue | null>(null);

export function NoteNavigationProvider({ children }: { children: ReactNode }) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewRequest, setViewRequest] = useState<NoteViewRequest | null>(null);
  const [highlightRequest, setHighlightRequest] = useState<NoteHighlightRequest | null>(null);

  const openNote = useCallback(
    (noteId: string | null, opts?: { view?: NoteView; highlightPhrases?: string[] }) => {
      setSelectedNoteId(noteId);

      if (opts?.view) {
        setViewRequest({ view: opts.view, nonce: Date.now() });
      } else {
        setViewRequest(null);
      }

      const phrases = (opts?.highlightPhrases ?? []).filter(Boolean);
      if (phrases.length > 0) {
        setHighlightRequest({ noteId, phrases, nonce: Date.now() });
      } else {
        setHighlightRequest(null);
      }
    },
    []
  );

  const value = useMemo<NoteNavigationContextValue>(
    () => ({
      selectedNoteId,
      openNote,
      viewRequest,
      highlightRequest,
    }),
    [openNote, selectedNoteId, viewRequest, highlightRequest]
  );

  return <NoteNavigationContext.Provider value={value}>{children}</NoteNavigationContext.Provider>;
}

export function useNoteNavigation() {
  const ctx = useContext(NoteNavigationContext);
  if (!ctx) {
    throw new Error("useNoteNavigation must be used within NoteNavigationProvider");
  }
  return ctx;
}
