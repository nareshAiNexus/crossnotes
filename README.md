# CrossNotes
A modern, open-source note-taking app that feels lightweight for writing—but powerful when you need answers.

CrossNotes is built around a simple idea: **your notes shouldn’t just sit there**. They should be searchable, linkable, and (optionally) **queryable with an AI assistant that stays grounded in your own content**.

**Repository**
- https://github.com/nareshAiNexus/crossnotes

**Author**
- https://github.com/nareshAiNexus

---

## Why this project exists
Most note apps do one of two things:
- they’re great for writing, but weak at retrieval, or
- they try to be “AI-first”, but don’t clearly show what came from *your notes*.

CrossNotes aims for a practical middle ground:
- a clean markdown writing experience
- fast organization (folders + notes)
- a Knowledge Base chat that answers questions using **retrieved note excerpts**, with clickable sources

---

## Key features
- **Markdown editor + preview** (mobile friendly)
- **Folders + notes**
- **Firebase-backed sync** (auth + database)
- **AI note formatting** (OpenRouter / DeepSeek)
- **Knowledge Base chat (RAG)**
  - indexes your notes (chunking + embeddings)
  - retrieves relevant excerpts
  - answers in a ChatGPT-style format
  - shows **Sources** and lets you click to open the source note
  - highlights the excerpt inside the note preview

---

## How the “Knowledge Base” works (high level)
This is a simple Retrieval-Augmented Generation (RAG) pipeline:
1. **Indexing**
   - Split each note into chunks
   - Create embeddings for each chunk in the browser
   - Store them in IndexedDB (local vector store)
2. **Question answering**
   - Embed the question
   - Find similar chunks
   - Use those excerpts as the context for the model
   - Return an answer + sources

### What runs locally vs remotely
- **Embeddings**: computed locally in the browser (Transformers.js)
- **Vector store**: local (IndexedDB)
- **Answer generation**:
  - Local LLM (WebGPU) when available (desktop only; disabled on mobile for performance)
  - Otherwise a remote model via OpenRouter (DeepSeek)

---

## Getting started (local development)

### Prerequisites
- Node.js 18+ recommended
- npm (or your preferred package manager)

### Install
```sh
git clone https://github.com/nareshAiNexus/crossnotes.git
cd crossnotes
npm install
```

### Environment variables
Copy the template and fill in values:
```sh
# Windows (PowerShell)
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

Required (Firebase):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Optional (AI formatting / remote answering via OpenRouter):
- `VITE_OPENROUTER_DEEPSEEK_API_KEY`
  - fallback supported: `VITE_DEEPSEEK_API_KEY`

### Run
```sh
npm run dev
```

### Build
```sh
npm run build
npm run preview
```

### Lint & test
```sh
npm run lint
npm run test
```

---

## User guide: writing & organizing notes
1. Create a folder (optional)
2. Create a note
3. Write in markdown on the left, preview on the right
4. Notes autosave

### Important: don’t store secrets in notes
If you index notes and use AI features, treat notes like any other synced data.
Avoid storing passwords, API keys, or sensitive personal identifiers.

---

## User guide: Knowledge Base chat (ask questions about your notes)
1. Open the **Knowledge Base** chat bubble
2. Click **Index notes** (first time)
3. Ask a question like:
   - “What did I write about X?”
   - “Summarize my note about Y”
   - “Which note mentions Z?”

### Clickable sources + highlighting
After an answer, you’ll see **Sources**.
Click a source note title to open it in preview mode—CrossNotes will highlight the relevant excerpt.

---

## Contributing
CrossNotes is an open-source project and contributions are welcome.

### Ways to contribute
- Fix bugs
- Improve performance (especially mobile)
- UX improvements (editor, sidebar, Knowledge Base chat)
- Documentation improvements

### Development workflow
1. Fork the repo
2. Create a branch:
   ```sh
   git checkout -b feat/my-change
   ```
3. Make changes
4. Run checks:
   ```sh
   npm run build
   npm run test
   npm run lint
   ```
5. Open a Pull Request

### Contributing “notes” (content)
This repo does **not** accept real user notes (privacy + safety).
If you want to contribute content for testing or demos:
- create **sanitized** example notes (no personal data)
- include them inside the PR description or as small sample text in the README / docs

---

## Project status
This project is actively evolving. Expect frequent changes as the Knowledge Base and UX improve.

---

## License
A license file is not currently present in this repository.
If you plan to use this as a long-lived open-source project, adding a license (e.g., MIT) is strongly recommended.

---

## Credits
Built with:
- React + Vite
- Tailwind CSS + shadcn/ui
- Firebase
- Transformers.js (browser embeddings)
- MLC WebLLM (optional local LLM via WebGPU)
- OpenRouter (DeepSeek model)
