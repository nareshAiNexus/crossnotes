import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from './useAuth';

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !database || !isFirebaseConfigured()) {
      setNotes([]);
      setFolders([]);
      setLoading(false);
      return;
    }

    const notesRef = ref(database, `users/${user.uid}/notes`);
    const foldersRef = ref(database, `users/${user.uid}/folders`);

    const unsubscribeNotes = onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notesList = Object.entries(data).map(([id, note]: [string, any]) => ({
          id,
          ...note,
        }));
        setNotes(notesList.sort((a, b) => b.updatedAt - a.updatedAt));
      } else {
        setNotes([]);
      }
    });

    const unsubscribeFolders = onValue(foldersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const foldersList = Object.entries(data).map(([id, folder]: [string, any]) => ({
          id,
          ...folder,
        }));
        setFolders(foldersList.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setFolders([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeNotes();
      unsubscribeFolders();
    };
  }, [user]);

  const createNote = useCallback(async (title: string, folderId: string | null = null) => {
    if (!user || !database) return null;

    const notesRef = ref(database, `users/${user.uid}/notes`);
    const newNoteRef = push(notesRef);
    const now = Date.now();

    const newNote = {
      id: newNoteRef.key!,
      title,
      content: '',
      folderId,
      createdAt: now,
      updatedAt: now,
    };

    await set(newNoteRef, newNote);
    return newNoteRef.key;
  }, [user]);

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    if (!user || !database) return;

    const noteRef = ref(database, `users/${user.uid}/notes/${noteId}`);
    await update(noteRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  }, [user]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!user || !database) return;

    const noteRef = ref(database, `users/${user.uid}/notes/${noteId}`);
    await remove(noteRef);
  }, [user]);

  const createFolder = useCallback(async (name: string) => {
    if (!user || !database) return null;

    const foldersRef = ref(database, `users/${user.uid}/folders`);
    const newFolderRef = push(foldersRef);

    await set(newFolderRef, {
      id: newFolderRef.key!,
      name,
      createdAt: Date.now(),
    });

    return newFolderRef.key;
  }, [user]);

  const updateFolder = useCallback(async (folderId: string, name: string) => {
    if (!user || !database) return;

    const folderRef = ref(database, `users/${user.uid}/folders/${folderId}`);
    await update(folderRef, { name });
  }, [user]);

  const deleteFolder = useCallback(async (folderId: string) => {
    if (!user || !database) return;

    // Move all notes in this folder to root
    const notesInFolder = notes.filter(note => note.folderId === folderId);
    for (const note of notesInFolder) {
      await updateNote(note.id, { folderId: null });
    }

    const folderRef = ref(database, `users/${user.uid}/folders/${folderId}`);
    await remove(folderRef);
  }, [user, notes, updateNote]);

  return {
    notes,
    folders,
    loading,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
