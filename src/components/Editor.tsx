import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Input } from '@/components/ui/input';
import { useNotes, type Note } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { Menu, Save, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import debounce from '@/lib/debounce';

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

  const handleContentChange = (newContent: string | undefined) => {
    const value = newContent || '';
    setContent(value);
    if (noteId) {
      debouncedSave(noteId, { content: value });
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
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
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
      <div className="flex-1 overflow-hidden editor-equal-height" data-color-mode={theme}>
        <MDEditor
          value={content}
          onChange={handleContentChange}
          preview="live"
          height="100%"
          visibleDragbar={true}
          hideToolbar={false}
          className="!border-0"
        />
      </div>
    </div>
  );
}
