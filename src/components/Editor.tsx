import { useState, useEffect, useCallback, useMemo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Input } from '@/components/ui/input';
import { useNotes, type Note } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { Menu, Save, FileText, Sparkles, Edit3, Eye, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import debounce from '@/lib/debounce';
import { formatNotesWithAI, isAIFormattingConfigured } from '@/lib/deepseek';
import { makeRehypeHighlighter } from '@/lib/rehype-highlight';
import { remarkSoftbreaksToBreaks } from '@/lib/remark-softbreaks';
import { toast } from 'sonner';

interface EditorProps {
  noteId: string | null;
  viewRequest?: { view: 'preview' | 'editor'; nonce: number } | null;
  highlightPhrases?: string[];
  highlightNonce?: number;
  onMenuClick: () => void;
  onToggleDesktopSidebar?: () => void;
  isDesktopSidebarHidden?: boolean;
}

export default function Editor({
  noteId,
  viewRequest,
  highlightPhrases,
  highlightNonce,
  onMenuClick,
  onToggleDesktopSidebar,
  isDesktopSidebarHidden,
}: EditorProps) {
  const { notes, updateNote } = useNotes();
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [desktopView, setDesktopView] = useState<'preview' | 'editor'>('preview'); // Desktop: preview first
  const [mobileView, setMobileView] = useState<'preview' | 'editor'>('preview'); // Mobile: preview first

  useEffect(() => {
    if (viewRequest?.view) {
      setDesktopView(viewRequest.view);
      setMobileView(viewRequest.view);
    }
  }, [viewRequest?.nonce]);

  const remarkPlugins = useMemo(() => [remarkSoftbreaksToBreaks], []);

  const rehypePlugins = useMemo(() => {
    const phrases = (highlightPhrases ?? []).filter(Boolean);
    if (phrases.length === 0) return [];
    // highlightNonce included to force plugin recreation when highlights change
    void highlightNonce;
    return [makeRehypeHighlighter(phrases)];
  }, [highlightPhrases, highlightNonce]);

  const note = notes.find(n => n.id === noteId);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);

      // Auto-switch to editor mode if note is empty (newly created)
      if (!note.content.trim()) {
        setDesktopView('editor');
        setMobileView('editor');
      }
    } else {
      setTitle('');
      setContent('');
    }
  }, [note?.id]);

  const debouncedSave = useCallback(
    debounce(async (noteId: string, updates: Partial<Note>) => {
      setIsSaving(true);
      await updateNote(noteId, updates);
      setTimeout(() => setIsSaving(false), 500);
    }, 1000),
    [updateNote]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (noteId) {
      debouncedSave(noteId, { title: newTitle });
    }
  };

  const handleContentChange = useCallback((value?: string) => {
    const newContent = value || '';
    setContent(newContent);
    // The instruction implies a change in debouncedSave signature, but only provides the call.
    // To maintain syntactic correctness and avoid unrelated edits, we'll keep the original debouncedSave signature.
    // This means the call here must match the original debouncedSave signature.
    if (noteId) {
      debouncedSave(noteId, { content: newContent });
    }
  }, [noteId, debouncedSave]); // Removed 'title' from dependencies as it's not used in the debouncedSave call here.

  const isAIConfigured = isAIFormattingConfigured();

  const handleAIFormat = async () => {
    if (!isAIConfigured) {
      toast.error('AI formatting is not configured. Add the API key to your .env and restart the dev server.');
      return;
    }

    if (!noteId || !content.trim()) {
      toast.error('No content to format');
      return;
    }

    setIsFormatting(true);
    try {
      toast.info('Formatting with AI...');
      const formattedContent = await formatNotesWithAI(content);
      setContent(formattedContent);

      // Save the formatted content
      if (noteId) {
        await updateNote(noteId, { content: formattedContent });
      }

      toast.success('Note formatted successfully!');
    } catch (error) {
      console.error('Failed to format note:', error);
      // Error toast is already shown in formatNotesWithAI
    } finally {
      setIsFormatting(false);
    }
  };

  if (!noteId) {
    return (
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Desktop header (keeps sidebar toggle accessible) */}
        <div className="hidden md:flex items-center gap-3 p-4 border-b border-border shrink-0">
          {onToggleDesktopSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onToggleDesktopSidebar}
              title={isDesktopSidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
            >
              {isDesktopSidebarHidden ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground animate-fade-in">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-medium mb-2">Select a note</h2>
            <p className="text-sm">Choose a note from the sidebar or create a new one</p>
            <Button
              variant="ghost"
              className="mt-4 md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-4 w-4 mr-2" />
              Open Sidebar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden animate-fade-in">
      {/* Mobile Header - Icons only */}
      <div className="md:hidden flex items-center gap-2 p-4 border-b border-border shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile View Toggle - Icons only */}
        <div className="flex gap-1.5 shrink-0">
          <Button
            variant={mobileView === 'preview' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setMobileView('preview')}
            className="h-10 w-10"
            title="Preview"
          >
            <Eye className="h-5 w-5" />
          </Button>
          <Button
            variant={mobileView === 'editor' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setMobileView('editor')}
            className="h-10 w-10"
            title="Edit"
          >
            <Edit3 className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Mobile AI Format Button - icon only - always visible */}
        <Button
          onClick={handleAIFormat}
          disabled={!isAIConfigured || isFormatting || !content.trim()}
          className={cn(
            "h-10 w-10",
            "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
            "text-white shadow-lg",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          size="icon"
          title={
            !isAIConfigured
              ? 'Configure AI formatting (set VITE_OPENROUTER_DEEPSEEK_API_KEY)'
              : 'Format with AI'
          }
        >
          <Sparkles className={cn(
            "h-5 w-5",
            isFormatting && "animate-spin"
          )} />
        </Button>

        {/* Saving indicator - mobile */}
        <div className={cn(
          "flex items-center gap-1 text-xs transition-opacity",
          isSaving ? "opacity-100" : "opacity-0"
        )}>
          <Save className="h-4 w-4 text-primary animate-pulse-subtle" />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center gap-3 p-4 border-b border-border shrink-0">
        {onToggleDesktopSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onToggleDesktopSidebar}
            title={isDesktopSidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
          >
            {isDesktopSidebarHidden ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Desktop Edit Button - show only in preview mode */}
        {desktopView === 'preview' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDesktopView('editor')}
            className="hidden md:flex h-8"
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}

        {/* Desktop Back to Preview Button - show only in editor mode */}
        {desktopView === 'editor' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDesktopView('preview')}
            className="hidden md:flex h-8"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        )}

        {/* Desktop AI Format Button - show only in editor mode */}
        {desktopView === 'editor' && (
          <Button
            onClick={handleAIFormat}
            disabled={!isAIConfigured || isFormatting || !content.trim()}
            className={cn(
              "hidden md:flex h-8",
              "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
              "text-white",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            size="sm"
            title={
              !isAIConfigured
                ? 'Configure AI formatting (set VITE_OPENROUTER_DEEPSEEK_API_KEY)'
                : 'Format with AI'
            }
          >
            <Sparkles className={cn(
              "h-4 w-4 mr-1",
              isFormatting && "animate-spin"
            )} />
            {isFormatting ? 'Formatting...' : 'AI Format'}
          </Button>
        )}

        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="flex-1 text-lg font-medium bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
        />
        <div className={cn(
          "hidden md:flex items-center gap-1 text-xs transition-opacity",
          isSaving ? "opacity-100" : "opacity-0"
        )}>
          <Save className="h-3 w-3 text-primary animate-pulse-subtle" />
          <span className="text-muted-foreground">Saving...</span>
        </div>
      </div>

      {/* Mobile Title Bar */}
      <div className="md:hidden flex items-center gap-2 px-4 py-4 border-b border-border shrink-0">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="flex-1 text-lg font-semibold bg-transparent border-none shadow-none focus-visible:ring-0 px-0 h-auto py-1"
        />
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 overflow-hidden editor-equal-height relative flex" data-color-mode={theme}>
        {/* Desktop: Show centered preview or editor */}
        <div className="hidden md:flex flex-1 w-full">
          {desktopView === 'preview' ? (
            // Centered Preview
            <div className="flex-1 overflow-auto flex items-start justify-center bg-background w-full">
              <div className="w-full max-w-3xl px-8 py-6">
                <article className="mx-auto prose lg:prose-lg max-w-none text-left">
                  <MDEditor.Markdown source={content} remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} />
                </article>
              </div>
            </div>
          ) : (
            // Editor Mode with preview on the right
            <div className="flex-1 flex flex-col">
              <MDEditor
                value={content}
                onChange={handleContentChange}
                preview="live"
                height="100%"
                visibleDragbar={false}
                hideToolbar={false}
                previewOptions={{ remarkPlugins, rehypePlugins }}
                className="!border-0 flex-1 w-full [&_.cm-editor]:!pl-12"
              />
            </div>
          )}
        </div>

        {/* Mobile: Show preview or editor full width, centered */}
        <div className="md:hidden flex-1 w-full">
          {mobileView === 'preview' ? (
            <div className="flex-1 overflow-auto flex items-start justify-center bg-background w-full h-full">
              <div className="w-full max-w-2xl px-5 py-6">
                <article className="mx-auto prose prose-base sm:prose-lg text-left dark:prose-invert">
                  <MDEditor.Markdown source={content || '*No content yet. Switch to edit mode to start writing.*'} remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} />
                </article>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <MDEditor
                value={content}
                onChange={handleContentChange}
                preview="edit"
                height="100%"
                visibleDragbar={false}
                hideToolbar={false}
                previewOptions={{ remarkPlugins, rehypePlugins }}
                className="!border-0 flex-1 w-full [&_.cm-editor]:!pl-4 [&_.cm-editor]:!pr-4 [&_.cm-editor]:!text-base [&_.cm-editor]:!leading-relaxed [&_.w-md-editor-toolbar]:!px-2 [&_.w-md-editor-toolbar]:!py-2 [&_.w-md-editor-preview]:!hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
