import { FileText, Sparkles, Share2, PenTool, Database, Menu, PanelLeftOpen, PanelLeftClose, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MDEditor from '@uiw/react-md-editor';
import { useTheme } from '@/hooks/useTheme';
import { useNotes } from '@/hooks/useNotes';
import { useNoteNavigation } from '@/hooks/useNoteNavigation';
import { toast } from 'sonner';

const WELCOME_MARKDOWN = `
# Welcome to CrossNotes! 🚀

A modern, open-source note-taking app that feels lightweight for writing—but powerful when you need answers.

CrossNotes is built around a simple idea: **your notes shouldn’t just sit there**. They should be searchable, linkable, and (optionally) **queryable with an AI assistant that stays grounded in your own content**.

---

## 🏗️ Key Features

- **📝 Markdown Editor + Preview**: A seamless writing experience with real-time preview, supporting GFM and Mermaid diagrams.
- **📂 Organization**: Keep your thoughts organized with folders and notes.
- **☁️ Firebase Sync**: Your notes are safely stored and synced across devices using Firebase.
- **✨ AI-Powered Formatting**: Use AI to quickly format or enhance your notes with a single click.
- **🧠 Knowledge Base Chat (RAG)**: 
  - Indexes your notes locally using embeddings.
  - Answers your questions based on your own content.
  - Provides clickable sources that highlight directly in your notes.

---

## 🚀 How to Get Started

1. **Create a Folder**: Use the sidebar to organize your notes.
2. **Start Writing**: Create a new note and let your ideas flow.
3. **Explore Knowledge Base**: Click the chat bubble to index your notes and start asking questions!

---

### 🛡️ Privacy First
All embeddings and vector storage happen **locally in your browser**. Your notes are yours.

---

*“Your notes are the bricks of your second brain. CrossNotes is the architect.”*
`;

interface WelcomeProps {
    onMenuClick: () => void;
    onToggleDesktopSidebar?: () => void;
    isDesktopSidebarHidden?: boolean;
}

export default function Welcome({
    onMenuClick,
    onToggleDesktopSidebar,
    isDesktopSidebarHidden,
}: WelcomeProps) {
    const { theme } = useTheme();
    const { createNote } = useNotes();
    const { openNote } = useNoteNavigation();

    const handleCreateNote = async () => {
        const title = 'Untitled Note';
        const noteId = await createNote(title, null); // Create at root
        if (noteId) {
            openNote(noteId);
            toast.success('Note created');
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-background overflow-hidden animate-fade-in">
            {/* Mobile Header - Menu button only */}
            <div className="md:hidden flex items-center p-4 border-b border-border shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-10 w-10"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            {/* Desktop header */}
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

            <div className="flex-1 overflow-auto flex items-start justify-center bg-background w-full">
                <div className="w-full max-w-4xl px-6 md:px-8 py-8 md:py-12">
                    {/* Header - Simplified for mobile */}
                    <div className="mb-8 md:mb-12 text-center">
                        <div className="hidden md:inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6 transition-transform duration-300">
                            <FileText className="h-12 w-12 text-primary" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 md:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                            CrossNotes
                        </h1>
                        <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto hidden md:block">
                            Your intelligent workspace for thoughts, ideas, and organized knowledge.
                        </p>
                        <div className="mt-6 flex justify-center">
                            <Button
                                onClick={handleCreateNote}
                                size="default"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-lg transition-all hover:scale-105 active:scale-95 px-6 font-medium"
                            >
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Features Grid - Hidden on mobile */}
                    <div className="hidden md:grid grid-cols-2 gap-6 mb-12">
                        <div className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
                            <PenTool className="h-8 w-8 text-blue-500 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Write with Ease</h3>
                            <p className="text-sm text-muted-foreground">Full Markdown support with live preview. Clean and distraction-free interface.</p>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
                            <Sparkles className="h-8 w-8 text-purple-500 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">AI Enhancement</h3>
                            <p className="text-sm text-muted-foreground">Instantly format or improve your writing using built-in AI capabilities. </p>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
                            <Database className="h-8 w-8 text-green-500 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Knowledge Base</h3>
                            <p className="text-sm text-muted-foreground">Your notes are indexed for intelligent retrieval. Ask your notes anything.</p>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
                            <Share2 className="h-8 w-8 text-orange-500 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Stay Synced</h3>
                            <p className="text-sm text-muted-foreground">Secure cloud storage ensures your notes are available wherever you go.</p>
                        </div>
                    </div>

                    <div className="rounded-xl md:rounded-2xl border border-border bg-background p-1 shadow-2xl shadow-primary/5">
                        <div className="bg-muted/30 rounded-lg md:rounded-xl p-5 md:p-10" data-color-mode={theme}>
                            <article className="prose prose-sm md:prose-base dark:prose-invert lg:prose-lg max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:underline">
                                <MDEditor.Markdown source={WELCOME_MARKDOWN} />
                            </article>
                        </div>
                    </div>

                    <div className="mt-10 md:mt-16 text-center text-xs md:text-sm text-muted-foreground">
                        <p>© {new Date().getFullYear()} CrossNotes • Open Source & Privacy Focused</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
