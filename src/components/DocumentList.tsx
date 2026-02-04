import { FileText, Trash2, Download, AlertCircle, Loader2, CheckCircle, Eye, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocuments } from '@/hooks/useDocuments';
import type { Document } from '@/types/document';
import { formatFileSize } from '@/lib/pdf-parser';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import PDFViewer from './PDFViewer';
import { toast } from 'sonner';

interface DocumentListProps {
    onSelectDocument?: (documentId: string) => void;
    selectedDocumentId?: string | null;
}

export default function DocumentList({ onSelectDocument, selectedDocumentId }: DocumentListProps) {
    const { documents, deleteDocument, getDocumentBlob, indexDocument } = useDocuments();
    const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

    const handleDownload = async (doc: Document) => {
        try {
            const blob = await getDocumentBlob(doc.id);
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = doc.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success(`Downloading ${doc.fileName}`);
            } else {
                toast.error('Could not retrieve document file');
            }
        } catch (error) {
            console.error('Error downloading document:', error);
            toast.error('Failed to download document');
        }
    };

    const handleIndex = async (doc: Document) => {
        try {
            await indexDocument(doc.id);
        } catch (error) {
            console.error('Error indexing document:', error);
            toast.error('Failed to index document');
        }
    };

    const getStatusIcon = (status: Document['status']) => {
        switch (status) {
            case 'uploading':
                return <CheckCircle className="h-3 w-3 text-green-500" />;
            case 'processing':
                return <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />;
            case 'indexed':
                return <CheckCircle className="h-3 w-3 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-3 w-3 text-destructive" />;
        }
    };

    const getStatusText = (status: Document['status']) => {
        switch (status) {
            case 'uploading':
                return 'Uploaded';
            case 'processing':
                return 'Indexing...';
            case 'indexed':
                return 'Indexed';
            case 'error':
                return 'Error';
        }
    };

    if (documents.length === 0) {
        return (
            <div className="px-3 py-4 text-center text-muted-foreground">
                <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No documents yet</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-1">
                {documents.map((doc) => (
                    <div
                        key={doc.id}
                        className={cn(
                            "group flex items-start gap-2 px-3 py-2 rounded-md transition-all",
                            "hover:bg-sidebar-accent cursor-pointer",
                            selectedDocumentId === doc.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                        onClick={() => onSelectDocument?.(doc.id)}
                    >
                        <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                    {formatFileSize(doc.fileSize)}
                                </span>
                                {doc.pageCount && (
                                    <>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <span className="text-xs text-muted-foreground">
                                            {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                {getStatusIcon(doc.status)}
                                <span className="text-xs text-muted-foreground">
                                    {getStatusText(doc.status)}
                                </span>
                                {doc.status === 'error' && doc.errorMessage && (
                                    <span className="text-xs text-destructive" title={doc.errorMessage}>
                                        - {doc.errorMessage.substring(0, 30)}...
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {(() => {
                                    const uploadedAt = typeof doc.uploadedAt === 'number' ? doc.uploadedAt : Number(doc.uploadedAt);
                                    const d = new Date(uploadedAt);
                                    return Number.isFinite(d.getTime()) ? format(d, 'MMM d, yyyy') : 'Unknown date';
                                })()}
                            </p>
                        </div>

                        <div className="flex gap-1 shrink-0">
                            {doc.mimeType === 'application/pdf' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingDocument(doc);
                                    }}
                                    title="View PDF"
                                >
                                    <Eye className="h-3 w-3" />
                                </Button>
                            )}
                            {!doc.indexed && doc.status !== 'processing' && doc.status !== 'error' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleIndex(doc);
                                    }}
                                    title="Index for search"
                                >
                                    <Database className="h-3 w-3 text-blue-500" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(doc);
                                }}
                                title="Download"
                            >
                                <Download className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDocument(doc.id);
                                }}
                                title="Delete document"
                            >
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {viewingDocument && (
                <PDFViewer
                    document={viewingDocument}
                    isOpen={!!viewingDocument}
                    onClose={() => setViewingDocument(null)}
                />
            )}
        </>
    );
}
