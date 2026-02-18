import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { useDocuments } from '@/hooks/useDocuments';
import type { Document } from '@/types/document';
import { Download, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface PPTXViewerProps {
    document: Document;
    isOpen: boolean;
    onClose: () => void;
}

export default function PPTXViewer({ document, isOpen, onClose }: PPTXViewerProps) {
    const { getDocumentBlob } = useDocuments();

    const handleDownload = async () => {
        try {
            const blob = await getDocumentBlob(document.id);
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = document.fileName;
                window.document.body.appendChild(a);
                a.click();
                window.document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success(`Downloading ${document.fileName}`);
                onClose();
            } else {
                toast.error('Could not retrieve document file');
            }   
        } catch (error) {
            console.error('Error downloading document:', error);
            toast.error('Failed to download document');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{document.fileName}</DialogTitle>
                    <DialogDescription>
                        PowerPoint presentation
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="bg-orange-100 p-4 rounded-full">
                        <FileText className="h-10 w-10 text-orange-600" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium text-lg">Preview Unavailable</h3>
                        <p className="text-sm text-muted-foreground">
                            PowerPoint files cannot be previewed directly in the browser due to their complexity.
                            Please download the file to view it in PowerPoint or Google Slides.
                        </p>
                    </div>

                    <div className="flex gap-2 w-full pt-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button className="flex-1 gap-2" onClick={handleDownload}>
                            <Download className="h-4 w-4" />
                            Download & View
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
