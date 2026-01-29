import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, MoreHorizontal, Trash2, Edit2, Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useNotes, type Note, type Folder as FolderType } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SidebarProps {
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ selectedNoteId, onSelectNote, isMobileOpen, onMobileClose }: SidebarProps) {
  const { notes, folders, createNote, createFolder, deleteNote, deleteFolder, updateFolder } = useNotes();
  const { user, logout } = useAuth();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [selectedFolderForNote, setSelectedFolderForNote] = useState<string | null>(null);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setIsNewFolderOpen(false);
    toast.success('Folder created');
  };

  const handleCreateNote = async (folderId: string | null = null) => {
    const title = newNoteName.trim() || 'Untitled';
    const noteId = await createNote(title, folderId);
    if (noteId) {
      onSelectNote(noteId);
      setNewNoteName('');
      setIsNewNoteOpen(false);
      onMobileClose();
      toast.success('Note created');
    }
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNote(noteId);
    toast.success('Note deleted');
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
    toast.success('Folder deleted');
  };

  const handleEditFolder = async (folderId: string) => {
    if (!editFolderName.trim()) return;
    await updateFolder(folderId, editFolderName.trim());
    setEditingFolder(null);
    toast.success('Folder renamed');
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
  };

  const rootNotes = notes.filter(note => !note.folderId);
  const getNotesByFolder = (folderId: string) => notes.filter(note => note.folderId === folderId);

  const NoteItem = ({ note }: { note: Note }) => (
    <div
      onClick={() => {
        onSelectNote(note.id);
        onMobileClose();
      }}
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all",
        "hover:bg-sidebar-accent",
        selectedNoteId === note.id && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <FileText className="h-4 w-4 text-note shrink-0" />
      <span className="truncate flex-1 text-sm">{note.title}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => handleDeleteNote(note.id, e)}
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center">
              <img src="/crossnotes-logo.png" alt="CrossNotes" className="h-8 w-8" />
            </div>
            <span className="font-semibold text-sidebar-foreground">CrossNotes</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-sidebar-foreground"
              onClick={onMobileClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 truncate">
          {user?.email}
        </p>
      </div>

      {/* Actions */}
      <div className="p-3 border-b border-sidebar-border flex gap-2 shrink-0">
        <Dialog open={isNewNoteOpen} onOpenChange={setIsNewNoteOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="flex-1 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Note
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Note title"
                value={newNoteName}
                onChange={(e) => setNewNoteName(e.target.value)}
                className="bg-input border-border"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNote(selectedFolderForNote)}
              />
              <select
                className="w-full p-2 rounded-md bg-input border border-border text-foreground text-sm"
                value={selectedFolderForNote || ''}
                onChange={(e) => setSelectedFolderForNote(e.target.value || null)}
              >
                <option value="">No folder</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
              <Button onClick={() => handleCreateNote(selectedFolderForNote)} className="w-full">
                Create Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="flex-1 text-xs">
              <Folder className="h-3 w-3 mr-1" />
              Folder
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="bg-input border-border"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <Button onClick={handleCreateFolder} className="w-full">
                Create Folder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Folders */}
        {folders.map(folder => (
          <div key={folder.id} className="animate-slide-in-left">
            <div className="flex items-center gap-1 group">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => toggleFolder(folder.id)}
              >
                {expandedFolders.has(folder.id) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
              <div className="flex items-center gap-2 flex-1 py-1 cursor-pointer" onClick={() => toggleFolder(folder.id)}>
                <Folder className="h-4 w-4 text-folder shrink-0" />
                {editingFolder === folder.id ? (
                  <Input
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    onBlur={() => handleEditFolder(folder.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditFolder(folder.id)}
                    className="h-6 text-sm bg-input border-border"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm truncate">{folder.name}</span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border-border">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingFolder(folder.id);
                      setEditFolderName(folder.name);
                    }}
                    className="text-foreground"
                  >
                    <Edit2 className="h-3 w-3 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {expandedFolders.has(folder.id) && (
              <div className="ml-6 mt-1 space-y-1">
                {getNotesByFolder(folder.id).map(note => (
                  <NoteItem key={note.id} note={note} />
                ))}
                {getNotesByFolder(folder.id).length === 0 && (
                  <p className="text-xs text-muted-foreground px-3 py-2">Empty folder</p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Root notes */}
        {rootNotes.length > 0 && (
          <div className="pt-2">
            {folders.length > 0 && (
              <p className="text-xs text-muted-foreground px-3 py-1 uppercase tracking-wider">Notes</p>
            )}
            {rootNotes.map(note => (
              <NoteItem key={note.id} note={note} />
            ))}
          </div>
        )}

        {notes.length === 0 && folders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Create your first note!</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 w-72 h-screen bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
