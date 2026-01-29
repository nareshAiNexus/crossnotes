import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Input } from '@/components/ui/input';
import { useNotes, type Note } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { Menu, Save, FileText, Sparkles, Edit3, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import debounce from '@/lib/debounce';
import { formatNotesWithAI } from '@/lib/deepseek';
import { toast } from 'sonner';

interface EditorProps {
  noteId: string | null;
  onMenuClick: () => void;
}

export default function Editor({ noteId, onMenuClick }: EditorProps) {
  const { notes, updateNote } = useNotes();
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [mobileView, setMobileView] = useState<'preview' | 'editor'>('preview'); // Mobile: preview first

  const note = notes.find(n => n.id === noteId);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
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

  const handleAIFormat = async () => {
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
      <div className="flex-1 flex items-center justify-center bg-background">
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
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden animate-fade-in">
      {/* Header with mobile toggle buttons */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile View Toggle Buttons */}
        <div className="md:hidden flex gap-2 shrink-0">
          <Button
            variant={mobileView === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMobileView('preview')}
            className="h-8"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button
            variant={mobileView === 'editor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMobileView('editor')}
            className="h-8"
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>

        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="flex-1 text-lg font-medium bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
        />
        <div className={cn(
          "flex items-center gap-1 text-xs transition-opacity",
          isSaving ? "opacity-100" : "opacity-0"
        )}>
          <Save className="h-3 w-3 text-primary animate-pulse-subtle" />
          <span className="text-muted-foreground">Saving...</span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden editor-equal-height relative" data-color-mode={theme}>
        <MDEditor
          value={content}
          onChange={handleContentChange}
          preview={mobileView === 'preview' ? 'preview' : (mobileView === 'editor' ? 'edit' : 'live')}
          height="100%"
          visibleDragbar={false}
          hideToolbar={false}
          className="!border-0"
        />

        {/* Floating AI Format Button - only show in editor mode on mobile, always on desktop */}
        <Button
          onClick={handleAIFormat}
          disabled={isFormatting || !content.trim()}
          className={cn(
            "absolute bottom-6 left-6 z-10",
            "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
            "text-white shadow-lg hover:shadow-xl",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            // Hide on mobile when in preview mode
            "md:flex",
            mobileView === 'preview' ? "hidden" : "flex"
          )}
          size="lg"
          title="Format with AI"
        >
          <Sparkles className={cn(
            "h-5 w-5 mr-2",
            isFormatting && "animate-spin"
          )} />
          {isFormatting ? 'Formatting...' : 'AI Format'}
        </Button>
      </div>
    </div>
  );
}
