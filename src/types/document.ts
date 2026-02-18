export interface Document {
    id: string;
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    /**
     * High-level type used for parsing/indexing. Kept to match existing Firebase rules.
     */
    fileType: 'pdf' | 'text' | 'docx' | 'pptx' | 'zip';
    uploadedAt: number;
    pageCount?: number;
    folderId: string | null;

    /**
     * Storage path kept to match existing Firebase rules. In this app we store blobs in IndexedDB.
     */
    storagePath: string; // ID in IndexedDB or Path in Firebase Storage
    storageRef?: string; // Reference for deletion
    storageType?: 'local' | 'firebase'; // New field to track storage location

    /**
     * Convenience boolean used by rules/UI.
     */
    indexed: boolean;

    // Processing status
    status: 'uploading' | 'processing' | 'indexed' | 'error';
    errorMessage?: string;
}

export interface PageText {
    pageNumber: number;
    text: string;
}

export interface PDFExtractionResult {
    text: string;
    pageCount: number;
    pages: PageText[];
}
