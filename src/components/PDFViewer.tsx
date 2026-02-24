import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useDocuments } from '@/hooks/useDocuments';
import type { Document as DocType } from '@/types/document';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PDFViewerProps {
    document: DocType;
    isOpen: boolean;
    onClose: () => void;
}

export default function PDFViewer({ document, isOpen, onClose }: PDFViewerProps) {
    const { getDocumentBlob } = useDocuments();
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.2); // Increased default scale
    const [loading, setLoading] = useState(false);

    // Load PDF when dialog opens
    useEffect(() => {
        if (isOpen && !pdfUrl) {
            loadPDF();
        }

        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [isOpen]);

    const loadPDF = async () => {
        setLoading(true);
        try {
            const blob = await getDocumentBlob(document.id);
            if (blob) {
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            } else {
                toast.error('Could not retrieve PDF file');
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
            toast.error('Failed to load PDF');
        } finally {
            setLoading(false);
        }
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    const changePage = (offset: number) => {
        setPageNumber((prevPageNumber) => prevPageNumber + offset);
    };

    const previousPage = () => changePage(-1);
    const nextPage = () => changePage(1);

    const handleClose = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
        setPageNumber(1);
        setScale(1.2); // Reset to default scale
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            {/* max-w-[95vw] and h-[95vh] to maximize screen usage */}
            <DialogContent className="bg-zinc-100 dark:bg-zinc-900 border-border max-w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden">
                {/* pr-12 to prevent close button overlap */}
                <DialogHeader className="px-4 pr-12 py-3 bg-card border-b border-border flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-foreground text-sm font-medium truncate max-w-md">
                        {document.fileName}
                    </DialogTitle>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-background rounded-md border border-border px-2 py-1 gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={pageNumber <= 1}
                                onClick={previousPage}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-mono min-w-[3rem] text-center">
                                {pageNumber} / {numPages || '--'}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={pageNumber >= (numPages || 0)}
                                onClick={nextPage}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-center bg-background rounded-md border border-border px-1 py-1 gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-xs w-12 text-center font-medium">{Math.round(scale * 100)}%</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setScale(s => Math.min(3.5, s + 0.2))}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto flex justify-center bg-zinc-200 dark:bg-zinc-950 p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : pdfUrl ? (
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="flex flex-col items-center"
                            loading={
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            }
                        >
                            <div className="shadow-2xl border border-border/10 mb-4">
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    className="bg-white"
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                />
                            </div>
                        </Document>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Failed to load PDF
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
