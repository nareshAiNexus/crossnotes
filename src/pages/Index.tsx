import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useNoteNavigation } from '@/hooks/useNoteNavigation';
import AuthPage from './AuthPage';
import { Loader2 } from 'lucide-react';

const SIDEBAR_WIDTH_KEY = 'crossnotes.sidebar.width';
const SIDEBAR_HIDDEN_KEY = 'crossnotes.sidebar.hidden';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function Index() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const { loading: notesLoading } = useNotes();
  const { selectedNoteId, openNote, viewRequest, highlightRequest } = useNoteNavigation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [desktopSidebarWidth, setDesktopSidebarWidth] = useState(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) ? clamp(parsed, 280, 520) : 288;
    } catch {
      return 288;
    }
  });

  const [isDesktopSidebarHidden, setIsDesktopSidebarHidden] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_HIDDEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(desktopSidebarWidth));
    } catch {
      // ignore
    }
  }, [desktopSidebarWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_HIDDEN_KEY, isDesktopSidebarHidden ? '1' : '0');
    } catch {
      // ignore
    }
  }, [isDesktopSidebarHidden]);

  const toggleDesktopSidebar = useCallback(() => {
    setIsDesktopSidebarHidden((v) => !v);
  }, []);

  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    // Ensure sidebar is visible when resizing
    setIsDesktopSidebarHidden(false);

    resizeStateRef.current = { startX: e.clientX, startWidth: desktopSidebarWidth };

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      const delta = ev.clientX - state.startX;
      const next = clamp(state.startWidth + delta, 280, 520);
      setDesktopSidebarWidth(next);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      resizeStateRef.current = null;
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };

    const onUp = () => cleanup();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }, [desktopSidebarWidth]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isConfigured || !user) {
    return <AuthPage />;
  }

  if (notesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar
        selectedNoteId={selectedNoteId}
        onSelectNote={(id) => openNote(id)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        desktopWidth={desktopSidebarWidth}
        isDesktopHidden={isDesktopSidebarHidden}
        onToggleDesktopHidden={toggleDesktopSidebar}
        onResizeStart={handleResizeStart}
      />
      <Editor
        noteId={selectedNoteId}
        viewRequest={viewRequest}
        highlightPhrases={
          highlightRequest && highlightRequest.noteId === selectedNoteId
            ? highlightRequest.phrases
            : []
        }
        highlightNonce={highlightRequest?.nonce ?? 0}
        onMenuClick={() => setIsMobileSidebarOpen(true)}
        onToggleDesktopSidebar={toggleDesktopSidebar}
        isDesktopSidebarHidden={isDesktopSidebarHidden}
      />
    </div>
  );
}
