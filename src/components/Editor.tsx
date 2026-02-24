import { useState, useEffect, useCallback, useMemo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Input } from '@/components/ui/input';
import { useNotes, type Note } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { Menu, Save, FileText, Sparkles, Edit3, Eye, PanelLeftOpen, PanelLeftClose, Zap, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, autoRenderImages, getTextContent } from '@/lib/utils';
import debounce from '@/lib/debounce';
import { formatNotesWithAI } from '@/lib/deepseek';
import { isGeminiConfigured } from '@/lib/gemini';
import { makeRehypeHighlighter } from '@/lib/rehype-highlight';
import { remarkSoftbreaksToBreaks } from '@/lib/remark-softbreaks';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ImageLightbox from '@/components/ImageLightbox';
import Mermaid from '@/components/Mermaid';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

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
  const [lightbox, setLightbox] = useState<{ isOpen: boolean; src: string; alt: string }>({
    isOpen: false,
    src: '',
    alt: '',
  });
  const [preAIContent, setPreAIContent] = useState<string | null>(null);
  const [aiFormattedContent, setAiFormattedContent] = useState<string | null>(null);

  useEffect(() => {
    if (viewRequest?.view) {
      setDesktopView(viewRequest.view);
      setMobileView(viewRequest.view);
    }
  }, [viewRequest?.nonce]);

  const remarkPlugins = useMemo(() => [remarkGfm, remarkSoftbreaksToBreaks], []);

  const rehypePlugins = useMemo(() => {
    const phrases = (highlightPhrases ?? []).filter(Boolean);
    // highlightNonce included to force plugin recreation when highlights change
    void highlightNonce; // This line is to acknowledge the dependency without using it directly
    if (phrases.length === 0) return [rehypeRaw];
    return [rehypeRaw, makeRehypeHighlighter(phrases)];
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
    setPreAIContent(null); // Clear undo state when switching notes
    setAiFormattedContent(null);
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

    // Clear AI history if user makes manual edits that are not undo/redo
    if (newContent !== aiFormattedContent && newContent !== preAIContent) {
      setPreAIContent(null);
      setAiFormattedContent(null);
    }

    if (noteId) {
      debouncedSave(noteId, { content: newContent });
    }
  }, [noteId, debouncedSave, aiFormattedContent, preAIContent]);

  const isAIConfigured = isGeminiConfigured();

  const handleAIFormat = async (mode: 'format' | 'enhance') => {
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
      const label = mode === 'format' ? 'Quick Formatting...' : 'Enhancing with AI...';
      toast.info(label);
      const formattedContent = await formatNotesWithAI(content, mode);

      // Save for Undo/Redo
      setPreAIContent(content);
      setAiFormattedContent(formattedContent);

      setContent(formattedContent);

      // Save the formatted content
      if (noteId) {
        await updateNote(noteId, { content: formattedContent });
      }

      const isQuickFormat = mode === 'format';
      toast.success(isQuickFormat ? 'Formatted successfully!' : 'Enhanced successfully!', {
        action: {
          label: 'Undo',
          onClick: () => {
            if (preAIContent !== null) {
              setContent(preAIContent);
              if (noteId) updateNote(noteId, { content: preAIContent });
              setPreAIContent(null); // Clear preAIContent after undo
              setAiFormattedContent(null); // Clear aiFormattedContent after undo
              toast.success('Restored original content');
            }
          }
        }
      });
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
        {/* Mobile AI Format Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
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
                  ? 'Configure AI formatting (set VITE_GEMINI_API_KEY)'
                  : 'AI Formatting Options'
              }
            >
              <Sparkles className={cn(
                "h-5 w-5",
                isFormatting && "animate-spin"
              )} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleAIFormat('format')}>
              <Zap className="mr-2 h-4 w-4" />
              <span>Quick Format</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAIFormat('enhance')}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Enhance with AI</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile Undo/Redo AI Button */}
        {(preAIContent !== null || aiFormattedContent !== null) && mobileView === 'editor' && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (content === aiFormattedContent && preAIContent) {
                // Undo: apply original
                setContent(preAIContent);
                if (noteId) updateNote(noteId, { content: preAIContent });
                toast.success('Restored original');
              } else if (content === preAIContent && aiFormattedContent) {
                // Redo: apply AI version
                setContent(aiFormattedContent);
                if (noteId) updateNote(noteId, { content: aiFormattedContent });
                toast.success('Applied AI changes');
              }
            }}
            className="h-10 w-10 border-primary/30 text-primary bg-primary/5 shadow-md flex items-center justify-center animate-pulse-subtle"
            title={content === aiFormattedContent ? 'Undo AI changes' : 'Redo AI changes'}
          >
            <Zap className={cn("h-5 w-5 fill-current", content === preAIContent && "rotate-180")} />
          </Button>
        )}

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

        {/* Desktop Undo/Redo AI Button */}
        {(preAIContent !== null || aiFormattedContent !== null) && desktopView === 'editor' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (content === aiFormattedContent && preAIContent) {
                // Undo: apply original
                setContent(preAIContent);
                if (noteId) updateNote(noteId, { content: preAIContent });
                toast.success('Restored original');
              } else if (content === preAIContent && aiFormattedContent) {
                // Redo: apply AI version
                setContent(aiFormattedContent);
                if (noteId) updateNote(noteId, { content: aiFormattedContent });
                toast.success('Applied AI changes');
              }
            }}
            className="flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Zap className={cn("h-4 w-4", content === preAIContent && "rotate-180")} />
            {content === aiFormattedContent ? 'Undo AI' : 'Redo AI'}
          </Button>
        )}

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

        {/* Desktop AI Format Dropdown - show only in editor mode */}
        {desktopView === 'editor' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={!isAIConfigured || isFormatting || !content.trim()}
                className={cn(
                  "hidden md:flex h-8 px-3",
                  "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
                  "text-white",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                size="sm"
                title={
                  !isAIConfigured
                    ? 'Configure AI formatting (set VITE_GEMINI_API_KEY)'
                    : 'AI Formatting Options'
                }
              >
                <Sparkles className={cn(
                  "h-4 w-4 mr-2",
                  isFormatting && "animate-spin"
                )} />
                {isFormatting ? 'Formatting...' : 'AI Format'}
                <ChevronDown className="ml-2 h-3 w-3 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleAIFormat('format')}>
                <Zap className="mr-2 h-4 w-4" />
                <span>Quick Format</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIFormat('enhance')}>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Enhance with AI</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  <MDEditor.Markdown
                    source={autoRenderImages(content)}
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={{
                      img: (props) => (
                        <img
                          {...props}
                          loading="lazy"
                          alt={props.alt || 'Image'}
                          className="rounded-lg shadow-md border border-border mx-auto cursor-zoom-in hover:scale-[1.01] transition-transform"
                          onClick={() => setLightbox({ isOpen: true, src: props.src || '', alt: props.alt || '' })}
                        />
                      ),
                      code: ({ inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        if (!inline && match && match[1] === 'mermaid') {
                          return <Mermaid chart={children} />;
                        }
                        return <code className={className} {...props}>{children}</code>;
                      }
                    }}
                  />
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
                previewOptions={{
                  remarkPlugins,
                  rehypePlugins,
                  components: {
                    img: (props: any) => (
                      <img
                        {...props}
                        loading="lazy"
                        alt={props.alt || 'Image'}
                        className="rounded-lg shadow-md border border-border mx-auto max-w-full cursor-zoom-in hover:scale-[1.01] transition-transform"
                        onClick={() => setLightbox({ isOpen: true, src: props.src || '', alt: props.alt || '' })}
                      />
                    ),
                    code: ({ inline, className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      if (!inline && match && match[1] === 'mermaid') {
                        return <Mermaid chart={children} />;
                      }
                      return <code className={className} {...props}>{children}</code>;
                    }
                  }
                }}
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
                  <MDEditor.Markdown
                    source={autoRenderImages(content || '*No content yet. Switch to edit mode to start writing.*')}
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={{
                      img: (props) => (
                        <img
                          {...props}
                          loading="lazy"
                          alt={props.alt || 'Image'}
                          className="rounded-lg shadow-md border border-border mx-auto cursor-zoom-in hover:scale-[1.01] transition-transform"
                          onClick={() => setLightbox({ isOpen: true, src: props.src || '', alt: props.alt || '' })}
                        />
                      ),
                      code: ({ inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        if (!inline && match && match[1] === 'mermaid') {
                          return <Mermaid chart={children} />;
                        }
                        return <code className={className} {...props}>{children}</code>;
                      }
                    }}
                  />
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
                previewOptions={{
                  remarkPlugins,
                  rehypePlugins,
                  components: {
                    img: (props: any) => (
                      <img
                        {...props}
                        loading="lazy"
                        alt={props.alt || 'Image'}
                        className="rounded-lg shadow-md border border-border mx-auto max-w-full cursor-zoom-in hover:scale-[1.01] transition-transform"
                        onClick={() => setLightbox({ isOpen: true, src: props.src || '', alt: props.alt || '' })}
                      />
                    ),
                    code: ({ inline, className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      if (!inline && match && match[1] === 'mermaid') {
                        return <Mermaid chart={children} />;
                      }
                      return <code className={className} {...props}>{children}</code>;
                    }
                  }
                }}
                className="!border-0 flex-1 w-full [&_.cm-editor]:!pl-4 [&_.cm-editor]:!pr-4 [&_.cm-editor]:!text-base [&_.cm-editor]:!leading-relaxed [&_.w-md-editor-toolbar]:!px-2 [&_.w-md-editor-toolbar]:!py-2 [&_.w-md-editor-preview]:!hidden"
              />
            </div>
          )}
        </div>
      </div>

      <ImageLightbox
        isOpen={lightbox.isOpen}
        src={lightbox.src}
        alt={lightbox.alt}
        onClose={() => setLightbox(prev => ({ ...prev, isOpen: false, alt: prev.alt }))}
      />
    </div>
  );
}
