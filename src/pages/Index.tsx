import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useNoteNavigation } from '@/hooks/useNoteNavigation';
import AuthPage from './AuthPage';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const { loading: notesLoading } = useNotes();
  const { selectedNoteId, openNote, viewRequest, highlightRequest } = useNoteNavigation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
      />
    </div>
  );
}
