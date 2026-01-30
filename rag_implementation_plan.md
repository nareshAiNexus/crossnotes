# RAG Knowledge Base (Simple Plan)

## Goal
Let users ask questions and get answers based on their own notes.

## What we will build (MVP)
1. **Index notes locally**
   - Split each note into chunks
   - Create an embedding for each chunk
   - Store embeddings in the browser (IndexedDB)
2. **Ask questions (RAG)**
   - Embed the user question
   - Find the most similar chunks
   - Send the chunks as context to the LLM
   - Return an answer + show sources

## Tech choices
- **Embeddings:** `@xenova/transformers` (runs in the browser)
  - Model: `Xenova/all-MiniLM-L6-v2` (384 dims)
  - First run downloads ~23MB then caches
- **Vector store:** IndexedDB (via `idb` helper)
- **Answering:** existing OpenRouter/DeepSeek integration

## Data flow
- Indexing:
  - note -> chunks -> embeddings -> IndexedDB
- Question:
  - question -> embedding -> similarity search -> top chunks -> LLM -> answer

## New modules/files
- `src/lib/chunking.ts`
  - `chunkNote({ title, content }) -> chunks[]`
- `src/lib/embeddings.ts`
  - `initEmbedder(onProgress?)`
  - `generateEmbedding(text) -> number[]`
- `src/lib/vectordb.ts`
  - store + retrieve chunks per `userId`
  - cosine similarity search
- `src/hooks/useKnowledgeBase.ts`
  - `indexAllNotes(notes)`
  - `indexNote(note)`
  - status + progress
- `src/lib/rag.ts`
  - `askFromNotes({ userId, question }) -> { answer, sources }`
- `src/components/KnowledgeBaseChat.tsx`
  - floating button + panel chat UI

## UI/UX
- Show a simple “Index my notes” action the first time.
- While indexing:
  - show progress (downloading model, indexing chunks)
- In chat:
  - show sources (note title + snippet)

## MVP limits
- No web workers
- No streaming
- No hybrid keyword search

## Done when
- You can click “Knowledge Base Chat”, ask a question, and get:
  - a grounded answer
  - citations from your notes
