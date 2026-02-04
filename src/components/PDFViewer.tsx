import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useDocuments } from '@/hooks/useDocuments';
import type { Document } from '@/types/document';
import { toast } from 'sonner';

interface PDFViewerProps {
    document: Document;
    isOpen: boolean;
    onClose: () => void;
}

export default function PDFViewer({ document, isOpen, onClose }: PDFViewerProps) {
    const { getDocumentBlob } = useDocuments();
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load PDF when dialog opens
    useEffect(() => {
        if (isOpen && !pdfUrl) {
            loadPDF();
        }

        // Cleanup on unmount or when closing
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [isOpen]);

    const loadPDF = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Loading PDF for document:', document.id);
            const blob = await getDocumentBlob(document.id);
            console.log('Got blob:', blob);

            if (blob) {
                // Verify it's a PDF blob
                if (blob.type !== 'application/pdf' && !blob.type.includes('pdf')) {
                    console.warn('Blob type is not PDF:', blob.type);
                }

                const url = URL.createObjectURL(blob);
                console.log('Created blob URL:', url);
                setPdfUrl(url);
            } else {
                console.error('No blob returned');
                setError('Failed to load PDF - file not found');
                toast.error('Could not load PDF file');
            }
        } catch (err) {
            console.error('Error loading PDF:', err);
            setError('Failed to load PDF');
            toast.error('Failed to load PDF');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="bg-card border-border max-w-6xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b border-border">
                    <DialogTitle className="text-foreground">{document.fileName}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-gray-100">
                    {loading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                                <p className="text-sm text-muted-foreground">Loading PDF...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <p className="text-sm text-destructive mb-2">{error}</p>
                                <Button onClick={loadPDF} variant="outline" size="sm">
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}

                    {pdfUrl && !loading && !error && (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full border-0"
                            title={document.fileName}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}