import { useCallback, useEffect, useRef, useState, useMemo, type PointerEvent as ReactPointerEvent } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import CommandPalette, { type Command } from '@/components/CommandPalette';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useNoteNavigation } from '@/hooks/useNoteNavigation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/hooks/useTheme';
import AuthPage from './AuthPage';
import Welcome from '@/components/Welcome';
import { Loader2, FileText, Folder, MessageCircle, Moon, Sun, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { NOTE_TEMPLATES, formatTemplateContent, formatTemplateTitle } from '@/lib/templates';

const SIDEBAR_WIDTH_KEY = 'crossnotes.sidebar.width';
const SIDEBAR_HIDDEN_KEY = 'crossnotes.sidebar.hidden';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function Index() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const { notes, folders, createNote, createFolder, loading: notesLoading } = useNotes();
  const { selectedNoteId, openNote, viewRequest, highlightRequest } = useNoteNavigation();
  const { theme, toggleTheme } = useTheme();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAuthMode, setShowAuthMode] = useState<'login' | 'signup' | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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

  // Command Palette Commands
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];

    // Navigation commands
    cmds.push({
      id: 'toggle-sidebar',
      label: isDesktopSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar',
      description: 'Toggle the sidebar visibility',
      icon: isDesktopSidebarHidden ? PanelLeftOpen : PanelLeftClose,
      keywords: ['sidebar', 'panel', 'toggle'],
      action: () => toggleDesktopSidebar(),
      group: 'Navigation',
    });

    cmds.push({
      id: 'open-kb-chat',
      label: 'Open Knowledge Base Chat',
      description: 'Ask questions about your notes',
      icon: MessageCircle,
      keywords: ['chat', 'ai', 'knowledge', 'ask', 'search'],
      action: () => {
        // Trigger the KB chat to open
        const kbButton = document.querySelector('[title="Knowledge Base Chat"]') as HTMLButtonElement;
        if (kbButton) kbButton.click();
      },
      group: 'Navigation',
    });

    // Creation commands
    cmds.push({
      id: 'new-note',
      label: 'New Note',
      description: 'Create a new note',
      icon: FileText,
      keywords: ['create', 'new', 'note', 'add'],
      action: async () => {
        const noteId = await createNote('Untitled', null);
        if (noteId) {
          openNote(noteId);
          toast.success('Note created');
        }
      },
      group: 'Create',
    });

    cmds.push({
      id: 'new-folder',
      label: 'New Folder',
      description: 'Create a new folder',
      icon: Folder,
      keywords: ['create', 'new', 'folder', 'add'],
      action: async () => {
        await createFolder('New Folder');
        toast.success('Folder created');
      },
      group: 'Create',
    });

    // Theme commands
    cmds.push({
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle between light and dark theme',
      icon: theme === 'dark' ? Sun : Moon,
      keywords: ['theme', 'dark', 'light', 'mode'],
      action: () => {
        toggleTheme();
        toast.success(`Switched to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      },
      group: 'Settings',
    });

    // Template commands
    NOTE_TEMPLATES.forEach((template) => {
      const Icon = template.icon;
      cmds.push({
        id: `template-${template.id}`,
        label: `New ${template.name}`,
        description: template.description,
        icon: Icon,
        keywords: ['template', 'new', template.name.toLowerCase(), template.category.toLowerCase()],
        action: async () => {
          const title = formatTemplateTitle(template.defaultTitle);
          const content = formatTemplateContent(template.content);
          const noteId = await createNote(title, null, content);
          if (noteId) {
            openNote(noteId);
            toast.success(`Created from ${template.name} template`);
          }
        },
        group: 'Templates',
      });
    });

    // Search notes commands
    notes.forEach((note) => {
      cmds.push({
        id: `open-note-${note.id}`,
        label: note.title || 'Untitled',
        description: 'Open this note',
        icon: FileText,
        keywords: ['note', 'open', note.title.toLowerCase()],
        action: () => {
          openNote(note.id);
          setIsMobileSidebarOpen(false);
        },
        group: 'Notes',
      });
    });

    return cmds;
  }, [isDesktopSidebarHidden, theme, notes, folders, createNote, createFolder, toggleDesktopSidebar, toggleTheme, openNote]);

  // Keyboard Shortcuts
  useKeyboardShortcuts(
    [
      {
        key: 'k',
        ctrlOrCmd: true,
        handler: () => setCommandPaletteOpen((prev) => !prev),
        description: 'Open command palette',
      },
      {
        key: 'b',
        ctrlOrCmd: true,
        handler: () => toggleDesktopSidebar(),
        description: 'Toggle sidebar',
      },
      {
        key: 'n',
        ctrlOrCmd: true,
        handler: async () => {
          const noteId = await createNote('Untitled', null);
          if (noteId) openNote(noteId);
        },
        description: 'New note',
      },
    ],
    user !== null // Only enable shortcuts when logged in
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isConfigured) {
    return <AuthPage />;
  }

  if (!user && !showAuthMode) {
    return (
      <Welcome
        onMenuClick={() => setIsMobileSidebarOpen(true)}
        onAuthClick={(mode) => setShowAuthMode(mode)}
      />
    );
  }

  if (!user && showAuthMode) {
    return <AuthPage initialMode={showAuthMode} onBack={() => setShowAuthMode(null)} />;
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
    <>
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
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        commands={commands}
      />
    </>
  );
}
