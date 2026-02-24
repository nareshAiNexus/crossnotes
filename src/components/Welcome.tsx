import { FileText, Sparkles, Share2, PenTool, Database, Menu, PanelLeftOpen, PanelLeftClose, ArrowRight, Shield, Rocket, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MDEditor from '@uiw/react-md-editor';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useNoteNavigation } from '@/hooks/useNoteNavigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
    onAuthClick?: (mode: 'login' | 'signup') => void;
}

export default function Welcome({
    onMenuClick,
    onToggleDesktopSidebar,
    isDesktopSidebarHidden,
    onAuthClick,
}: WelcomeProps) {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { createNote } = useNotes();
    const { openNote } = useNoteNavigation();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            setScrolled(target.scrollTop > 20);
        };
        const container = document.getElementById('welcome-scroll-container');
        container?.addEventListener('scroll', handleScroll);
        return () => container?.removeEventListener('scroll', handleScroll);
    }, []);

    const handleCreateNote = async () => {
        const title = 'Untitled Note';
        const noteId = await createNote(title, null); // Create at root
        if (noteId) {
            openNote(noteId);
            toast.success('Note created');
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-background relative overflow-hidden font-sans">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] animate-blob" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] animate-blob [animation-delay:2s]" />
            <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px] animate-blob [animation-delay:4s]" />

            {/* Header - Fixed/Sticky on scroll */}
            <div className={cn(
                "sticky top-0 z-50 flex items-center justify-between p-4 transition-all duration-300 border-b",
                scrolled ? "bg-background/80 backdrop-blur-md border-border" : "bg-transparent border-transparent"
            )}>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden h-10 w-10 hover:bg-primary/10 transition-colors"
                        onClick={onMenuClick}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    {onToggleDesktopSidebar && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex h-9 w-9 hover:bg-primary/10 transition-colors"
                            onClick={onToggleDesktopSidebar}
                            title={isDesktopSidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
                        >
                            {isDesktopSidebarHidden ? (
                                <PanelLeftOpen className="h-4 w-5" />
                            ) : (
                                <PanelLeftClose className="h-4 w-5" />
                            )}
                        </Button>
                    )}

                    <div className="flex items-center gap-2 ml-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 animate-float">
                            <FileText className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            CrossNotes
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {!user ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="hidden sm:flex rounded-full px-5 font-semibold hover:bg-primary/5"
                                onClick={() => onAuthClick?.('login')}
                            >
                                Log in
                            </Button>
                            <Button
                                size="sm"
                                className="rounded-full px-5 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                onClick={() => onAuthClick?.('signup')}
                            >
                                Sign up
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:flex rounded-full px-4 border-primary/20 hover:bg-primary/5 transition-all active:scale-95"
                            onClick={handleCreateNote}
                        >
                            New Note
                        </Button>
                    )}
                </div>
            </div>

            <div id="welcome-scroll-container" className="flex-1 overflow-auto relative z-10 px-6 py-12 md:py-20">
                <div className="max-w-6xl mx-auto space-y-24">

                    {/* Hero Section */}
                    <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium animate-pulse-slow">
                            <Rocket className="h-4 w-4" />
                            <span>v2.0 Now with AI Knowledge Base</span>
                        </div>

                        <h2 className="text-4xl md:text-7xl font-extrabold tracking-tighter max-w-4xl mx-auto leading-[1.1]">
                            Your thoughts, organized and <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-600 animate-text-shimmer bg-[length:200%_auto]">supercharged.</span>
                        </h2>

                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            A lightweight workspace that grows with you. Connect your nodes,
                            chat with your data, and write with pure focus.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Button
                                onClick={() => user ? handleCreateNote() : onAuthClick?.('signup')}
                                size="lg"
                                className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-lg font-semibold group relative overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {user ? 'Create a Note' : 'Get Started Free'}
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </Button>

                            {!user && (
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="h-14 px-8 rounded-2xl text-muted-foreground hover:text-foreground transition-all font-medium"
                                    onClick={() => onAuthClick?.('login')}
                                >
                                    Login to Account
                                </Button>
                            )}
                        </div>
                    </section>

                    {/* Bento Feature Grid */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 -z-10" />
                        <section className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:h-[400px] animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
                            {/* Knowledge Base Card */}
                            <div className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-[2rem] border border-border bg-card p-7 transition-all hover:shadow-2xl hover:shadow-green-500/5 hover:border-green-500/20">
                                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors duration-500" />

                                <div className="h-full flex flex-col justify-between relative z-10">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform duration-500">
                                            <Brain className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-2xl font-bold tracking-tight">AI Knowledge Base</h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            Your notes are more than text. Our local RAG engine allows you to chat with
                                            everything you've written, citing precise sources directly.
                                        </p>
                                        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-green-500/80 font-medium pt-2">
                                            <li className="flex items-center gap-1.5"><Sparkles className="h-2.5 w-2.5" /> Source Citation</li>
                                            <li className="flex items-center gap-1.5"><Sparkles className="h-2.5 w-2.5" /> Local Vector RAG</li>
                                            <li className="flex items-center gap-1.5"><Sparkles className="h-2.5 w-2.5" /> Smart Summaries</li>
                                            <li className="flex items-center gap-1.5"><Sparkles className="h-2.5 w-2.5" /> Privacy First</li>
                                        </ul>
                                    </div>
                                    <div className="mt-4 relative h-24 w-full bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden border border-border/50 group-hover:border-green-500/30 transition-colors">
                                        <div className="absolute top-0 left-0 right-0 h-6 bg-muted/40 border-b border-border/50 flex items-center px-3 gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-red-500/30" />
                                            <div className="w-2 h-2 rounded-full bg-amber-500/30" />
                                            <div className="w-2 h-2 rounded-full bg-green-500/30" />
                                            <span className="text-[9px] text-muted-foreground ml-2 font-mono opacity-50">Local RAG Terminal</span>
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 top-6 p-3 font-mono text-[9px] space-y-2 opacity-60">
                                            <div className="flex gap-2">
                                                <span className="text-green-500">{'>'}</span>
                                                <span className="text-foreground">Searching notes for "Project Timeline"...</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-purple-500">{'⚡'}</span>
                                                <span className="text-muted-foreground">Found 3 relevant chunks in 12ms.</span>
                                            </div>
                                            <div className="h-2 w-[80%] bg-green-500/20 rounded animate-pulse" />
                                        </div>
                                        <div className="absolute bottom-0 right-0 p-2 opacity-50">
                                            <Database className="h-4 w-4 text-green-500 animate-float" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Formatting Card */}
                            <div className="md:col-span-2 group relative overflow-hidden rounded-[2rem] border border-border bg-card p-7 transition-all hover:shadow-2xl hover:shadow-purple-500/5 hover:border-purple-500/20">
                                <div className="h-full flex items-center justify-between relative z-10">
                                    <div className="space-y-1">
                                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:rotate-12 transition-transform">
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-xl font-bold">One-Click AI Format</h3>
                                        <p className="text-muted-foreground text-xs font-medium">
                                            Transform messy thoughts into structured notes instantly.
                                        </p>
                                        <div className="flex gap-2 pt-2">
                                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-[10px] text-purple-500 font-bold border border-purple-500/20">Clean</span>
                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] text-blue-500 font-bold border border-blue-500/20">Summary</span>
                                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] text-green-500 font-bold border border-green-500/20">Refactor</span>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full border border-purple-500/20 relative group-hover:scale-105 transition-transform">
                                        <Sparkles className="h-8 w-8 text-purple-500/40" />
                                        <div className="absolute inset-0 border-2 border-dashed border-purple-500/10 rounded-full animate-spin-slow" />
                                    </div>
                                </div>
                            </div>

                            {/* Privacy Card */}
                            <div className="group relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 transition-all hover:shadow-2xl hover:border-green-500/20">
                                <div className="space-y-3 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                                            <Shield className="h-4 w-4" />
                                        </div>
                                        <span className="text-[10px] font-bold text-green-500/50 font-mono">ENCRYPTED</span>
                                    </div>
                                    <h3 className="text-lg font-bold">100% Private</h3>
                                    <p className="text-muted-foreground text-[11px] leading-snug">
                                        Your data never leaves your device for processing. Encrypted local vector storage ensures absolute privacy.
                                    </p>
                                    <div className="flex gap-1 pt-1 opacity-40">
                                        <div className="h-1 w-8 bg-green-500 rounded-full" />
                                        <div className="h-1 w-4 bg-green-500 rounded-full" />
                                        <div className="h-1 w-6 bg-green-500 rounded-full" />
                                    </div>
                                </div>
                            </div>

                            {/* Cloud Card */}
                            <div className="group relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 transition-all hover:shadow-2xl hover:border-orange-500/20">
                                <div className="space-y-3 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <Share2 className="h-4 w-4" />
                                        </div>
                                        <div className="flex -space-x-2">
                                            <div className="w-5 h-5 rounded-full bg-muted border border-background" />
                                            <div className="w-5 h-5 rounded-full bg-orange-500/20 border border-background" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold">Safe Sync</h3>
                                    <p className="text-muted-foreground text-[11px] leading-snug">
                                        Seamless synchronization across all your platforms powered by robust Firebase security protocols.
                                    </p>
                                    <div className="flex items-center gap-2 pt-1">
                                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                            <div className="w-2/3 h-full bg-orange-500 animate-pulse" />
                                        </div>
                                        <span className="text-[9px] font-mono text-muted-foreground">99%</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* About Window Frame */}
                    <section className="animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
                        <div className="text-center mb-8">
                            <h3 className="text-3xl font-bold">Read the documentation</h3>
                            <p className="text-muted-foreground">Everything you need to know to master CrossNotes.</p>
                        </div>

                        <div className="group relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-600/20 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

                            <div className="relative rounded-[2rem] border border-border bg-background shadow-2xl overflow-hidden">
                                {/* Window ToolBar */}
                                <div className="bg-muted/30 px-6 py-4 border-b border-border flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                                    </div>
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        README.md
                                    </div>
                                    <div className="w-12" />
                                </div>

                                <div className="bg-muted/10 p-8 md:p-16 h-[500px] overflow-auto custom-scrollbar" data-color-mode={theme}>
                                    <article className="prose prose-sm md:prose-base dark:prose-invert lg:prose-lg max-w-2xl mx-auto prose-headings:font-bold prose-a:text-primary hover:prose-a:underline">
                                        <MDEditor.Markdown source={WELCOME_MARKDOWN} />
                                    </article>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="pt-20 pb-10 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                                <FileText className="h-3 w-3 text-primary" />
                            </div>
                            <span className="font-semibold text-foreground">CrossNotes</span>
                            <span>© {new Date().getFullYear()}</span>
                        </div>

                        <div className="flex items-center gap-8">
                            <a href="#" className="hover:text-primary transition-colors">Twitter</a>
                            <a href="#" className="hover:text-primary transition-colors">GitHub</a>
                            <a href="#" className="hover:text-primary transition-colors">Discord</a>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span>System Status: Operational</span>
                        </div>
                    </footer>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground pointer-events-none animate-bounce">
                <span className="text-[10px] uppercase tracking-widest font-bold">Scroll</span>
                <div className="w-[1px] h-8 bg-gradient-to-b from-muted-foreground/50 to-transparent" />
            </div>
        </div>
    );
}
