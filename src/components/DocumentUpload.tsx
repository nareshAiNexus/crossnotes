import { useState, useCallback } from 'react';
import { Upload, X, FileText, Loader2, Cloud, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useDocuments } from '@/hooks/useDocuments';
import { formatFileSize, isValidFileSize } from '@/lib/pdf-parser';
import { isSupportedDocumentFile, supportedAcceptString } from '@/lib/document-parser';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DocumentUploadProps {
    folderId?: string | null;
    onUploadComplete?: () => void;
}

export default function DocumentUpload({ folderId, onUploadComplete }: DocumentUploadProps) {
    const { uploadDocument, uploadProgress } = useDocuments();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local');

    const handleFileSelect = (file: File) => {
        if (!isSupportedDocumentFile(file)) {
            toast.error('Unsupported file type. Supported: PDF, TXT/MD/CSV/JSON, DOCX, PPTX, ZIP');
            return;
        }

        if (!isValidFileSize(file, 10)) {
            toast.error('File size must be less than 10MB');
            return;
        }

        setSelectedFile(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleUpload = async () => {
        if (!selectedFile) return;

        const result = await uploadDocument(selectedFile, folderId || null, storageMode);

        if (result) {
            setSelectedFile(null);
            setIsOpen(false);
            onUploadComplete?.();
        }
    };

    const handleClose = () => {
        if (!uploadProgress) {
            setIsOpen(false);
            setSelectedFile(null);
        }
    };

    const isUploading = uploadProgress !== null;

    return (
        <>
            <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => setIsOpen(true)}
            >
                <Upload className="h-3 w-3 mr-1" />
                Upload File
            </Button>

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="bg-card border-border sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Upload Document</DialogTitle>
                    </DialogHeader>

                    {!isUploading ? (
                        <div className="space-y-4">
                            {/* Drag and drop area */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                                    isDragging
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:border-primary/50"
                                )}
                                onClick={() => document.getElementById('file-input')?.click()}
                            >
                                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-sm font-medium mb-1">
                                    {selectedFile ? selectedFile.name : 'Drop file here or click to browse'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedFile
                                        ? formatFileSize(selectedFile.size)
                                        : 'Maximum file size: 10MB'}
                                </p>
                            </div>

                            <input
                                id="file-input"
                                type="file"
                                accept={supportedAcceptString()}
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                            />

                            {/* Storage Mode Toggle */}
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                                <div className="flex items-center space-x-2">
                                    {storageMode === 'cloud' ? (
                                        <Cloud className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <HardDrive className="h-4 w-4 text-gray-500" />
                                    )}
                                    <div className="flex flex-col">
                                        <Label htmlFor="storage-mode" className="text-sm font-medium cursor-pointer">
                                            {storageMode === 'cloud' ? 'Cloud Storage' : 'Local Storage'}
                                        </Label>
                                        <span className="text-xs text-muted-foreground">
                                            {storageMode === 'cloud'
                                                ? 'Synced across devices (Firebase)'
                                                : 'Private, on this device only'}
                                        </span>
                                    </div>
                                </div>
                                <Switch
                                    id="storage-mode"
                                    checked={storageMode === 'cloud'}
                                    onCheckedChange={(checked) => setStorageMode(checked ? 'cloud' : 'local')}
                                />
                            </div>

                            {selectedFile && (
                                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                    <FileText className="h-5 w-5 text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(selectedFile.size)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={() => setSelectedFile(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    disabled={!selectedFile}
                                    className="flex-1"
                                >
                                    Upload
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {/* Upload progress */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{uploadProgress.message}</span>
                                    <span className="text-muted-foreground">{uploadProgress.progress}%</span>
                                </div>
                                <Progress value={uploadProgress.progress} className="h-2" />
                            </div>

                            {/* Stage indicator */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>
                                    {uploadProgress.stage === 'uploading' && 'Uploading file...'}
                                    {uploadProgress.stage === 'extracting' && 'Extracting text from PDF...'}
                                    {uploadProgress.stage === 'embedding' && 'Generating embeddings...'}
                                    {uploadProgress.stage === 'indexing' && 'Indexing for search...'}
                                    {uploadProgress.stage === 'complete' && 'Complete!'}
                                </span>
                            </div>

                            <p className="text-xs text-muted-foreground text-center">
                                This may take a few moments depending on the document size.
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
