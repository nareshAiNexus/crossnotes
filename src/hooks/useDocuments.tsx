import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Document } from '@/types/document';
import {
    storePDFBlob,
    getPDFBlob,
    deletePDFBlob,
    saveDocumentMetadata,
    updateDocumentMetadata,
    deleteDocumentMetadata,
    subscribeToDocuments,
    generateDocumentId,
} from '@/lib/document-storage';
import { isValidFileSize } from '@/lib/pdf-parser';
import { detectFileType, extractTextFromFile, isSupportedDocumentFile } from '@/lib/document-parser';
import { chunkDocument } from '@/lib/chunking';
import { generateEmbedding } from '@/lib/embeddings';
import { upsertChunks, deleteChunksBySource } from '@/lib/vectordb';
import { toast } from 'sonner';

export interface UploadProgress {
    stage: 'uploading' | 'extracting' | 'embedding' | 'indexing' | 'complete';
    progress: number; // 0-100
    message: string;
}

export function useDocuments() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

    // Subscribe to documents from Firebase
    useEffect(() => {
        if (!user) {
            setDocuments([]);
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToDocuments(user.uid, (docs) => {
            setDocuments(docs);
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    /**
     * Upload a document (store only, no indexing)
     */
    const uploadDocument = useCallback(
        async (file: File, folderId: string | null = null): Promise<string | null> => {
            if (!user) {
                toast.error('You must be logged in to upload documents');
                return null;
            }

            // Validate file
            if (!isSupportedDocumentFile(file)) {
                toast.error('Unsupported file type. Supported: PDF, TXT/MD/CSV/JSON, DOCX, PPTX');
                return null;
            }

            if (!isValidFileSize(file, 10)) {
                toast.error('File size must be less than 10MB');
                return null;
            }

            const documentId = generateDocumentId(user.uid);

            try {
                // Stage 1: Upload file to IndexedDB
                setUploadProgress({
                    stage: 'uploading',
                    progress: 50,
                    message: 'Uploading file...',
                });

                await storePDFBlob(documentId, file);

                // Create metadata (no extraction yet)
                const fileType = detectFileType(file);
                if (!fileType) {
                    throw new Error('Unsupported file type');
                }

                const document: Document = {
                    id: documentId,
                    userId: user.uid,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    fileType,
                    uploadedAt: Date.now(),
                    folderId,
                    storagePath: documentId,
                    storageRef: documentId,
                    indexed: false,
                    status: 'uploading', // Changed from 'processing'
                };

                await saveDocumentMetadata(user.uid, document);

                // Mark as uploaded (not indexed)
                await updateDocumentMetadata(user.uid, documentId, {
                    status: 'uploading', // User can view but not search yet
                });

                setUploadProgress({
                    stage: 'complete',
                    progress: 100,
                    message: 'Document uploaded successfully!',
                });

                toast.success(`${file.name} uploaded! You can view it now. Click "Index" in AI chat to make it searchable.`);

                // Clear progress after a delay
                setTimeout(() => setUploadProgress(null), 2000);

                return documentId;
            } catch (error) {
                console.error('Error uploading document:', error);

                const msg = error instanceof Error ? error.message : String(error);
                if (/permission[_ ]denied/i.test(msg) || /PERMISSION_DENIED/i.test(msg)) {
                    toast.error(
                        'Upload blocked by Firebase rules (PERMISSION_DENIED). Ensure RTDB rules allow writes to users/$uid/documents.'
                    );
                }

                // Update document status to error
                try {
                    await updateDocumentMetadata(user.uid, documentId, {
                        status: 'error',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    });
                } catch (updateError) {
                    console.error('Error updating document status:', updateError);
                }

                toast.error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setUploadProgress(null);
                return null;
            }
        },
        [user]
    );

    /**
     * Index a document (extract text and create embeddings)
     */
    const indexDocument = useCallback(
        async (documentId: string): Promise<boolean> => {
            if (!user) {
                toast.error('You must be logged in to index documents');
                return false;
            }

            try {
                // Get document metadata
                const doc = documents.find(d => d.id === documentId);
                if (!doc) {
                    toast.error('Document not found');
                    return false;
                }

                // Get the file blob
                const blob = await getPDFBlob(documentId);
                if (!blob) {
                    toast.error('Could not retrieve document file');
                    return false;
                }

                // Convert blob to File
                const file = new File([blob], doc.fileName, { type: doc.mimeType });

                // Update status to processing
                await updateDocumentMetadata(user.uid, documentId, {
                    status: 'processing',
                });

                // Stage 1: Extract text
                setUploadProgress({
                    stage: 'extracting',
                    progress: 20,
                    message: 'Extracting text...',
                });

                const { extraction: extractionResult } = await extractTextFromFile(file, (progress) => {
                    setUploadProgress({
                        stage: 'extracting',
                        progress: 20 + Math.floor(progress * 0.3), // 20-50%
                        message: `Extracting text... ${progress}%`,
                    });
                });

                // Update metadata with page/slide count
                await updateDocumentMetadata(user.uid, documentId, {
                    pageCount: extractionResult.pageCount,
                });

                // Stage 2: Chunk the document
                setUploadProgress({
                    stage: 'embedding',
                    progress: 50,
                    message: 'Chunking document...',
                });

                const chunks = chunkDocument({
                    id: documentId,
                    fileName: doc.fileName,
                    pages: extractionResult.pages,
                });

                if (chunks.length === 0) {
                    throw new Error('No text could be extracted from the document');
                }

                // Stage 3: Generate embeddings
                setUploadProgress({
                    stage: 'embedding',
                    progress: 60,
                    message: `Generating embeddings for ${chunks.length} chunks...`,
                });

                const vectorChunks = [];
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    const vector = await generateEmbedding(chunk.content);

                    vectorChunks.push({
                        chunkId: chunk.chunkId,
                        userId: user.uid,
                        sourceId: documentId,
                        sourceType: 'document' as const,
                        sourceTitle: doc.fileName,
                        chunkIndex: chunk.chunkIndex,
                        content: chunk.content,
                        vector,
                        updatedAt: Date.now(),
                        pageNumber: chunk.pageNumber,
                        fileName: doc.fileName,
                    });

                    // Update progress
                    const progress = 60 + Math.floor(((i + 1) / chunks.length) * 30); // 60-90%
                    setUploadProgress({
                        stage: 'embedding',
                        progress,
                        message: `Embedding chunk ${i + 1}/${chunks.length}...`,
                    });
                }

                // Stage 4: Store in vector database
                setUploadProgress({
                    stage: 'indexing',
                    progress: 90,
                    message: 'Indexing document...',
                });

                await upsertChunks(vectorChunks);

                // Update document status
                await updateDocumentMetadata(user.uid, documentId, {
                    status: 'indexed',
                    indexed: true,
                });

                setUploadProgress({
                    stage: 'complete',
                    progress: 100,
                    message: 'Document indexed successfully!',
                });

                toast.success(`${doc.fileName} indexed successfully!`);

                // Clear progress after a delay
                setTimeout(() => setUploadProgress(null), 2000);

                return true;
            } catch (error) {
                console.error('Error indexing document:', error);

                toast.error(`Failed to index document: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setUploadProgress(null);
                return false;
            }
        },
        [user, documents]
    );

    /**
     * Delete a document
     */
    const deleteDocument = useCallback(
        async (documentId: string): Promise<void> => {
            if (!user) return;

            try {
                // Delete from vector database
                await deleteChunksBySource(user.uid, documentId);

                // Delete PDF blob from IndexedDB
                await deletePDFBlob(documentId);

                // Delete metadata from Firebase
                await deleteDocumentMetadata(user.uid, documentId);

                toast.success('Document deleted');
            } catch (error) {
                console.error('Error deleting document:', error);
                toast.error('Failed to delete document');
            }
        },
        [user]
    );

    /**
     * Get PDF blob for viewing/downloading
     */
    const getDocumentBlob = useCallback(
        async (documentId: string): Promise<Blob | null> => {
            try {
                return await getPDFBlob(documentId);
            } catch (error) {
                console.error('Error getting document blob:', error);
                return null;
            }
        },
        []
    );

    return {
        documents,
        loading,
        uploadProgress,
        uploadDocument,
        indexDocument,
        deleteDocument,
        getDocumentBlob,
    };
}
