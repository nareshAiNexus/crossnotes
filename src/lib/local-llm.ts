export interface LocalLLMOptions {
  modelId?: string;
  onProgress?: (text: string) => void;
}

let enginePromise: Promise<any> | null = null;

/**
 * Creates (and caches) a WebLLM engine.
 * Note: WebLLM requires WebGPU and can be heavy; this is lazy-loaded.
 */
export async function initLocalLLM(opts?: LocalLLMOptions) {
  if (!enginePromise) {
    enginePromise = (async () => {
      const webllm = await import("@mlc-ai/web-llm");
      const engine = new webllm.MLCEngine();

      const modelId = opts?.modelId ?? "Llama-3.2-1B-Instruct-q4f16_1-MLC";

      await engine.reload(modelId, {
        initProgressCallback: (p: any) => {
          if (typeof p?.text === "string") {
            opts?.onProgress?.(p.text);
          }
        },
      });

      return engine;
    })();
  }

  return enginePromise;
}

export function isWebGPUAvailable() {
  return typeof navigator !== "undefined" && !!(navigator as any).gpu;
}

export async function generateLocalAnswer(params: {
  question: string;
  context: string;
  onProgressText?: (t: string) => void;
}): Promise<string> {
  if (!isWebGPUAvailable()) {
    throw new Error("WebGPU is not available on this device/browser");
  }

  const engine = await initLocalLLM({ onProgress: params.onProgressText });

  const system =
    "You are a helpful assistant. Answer the user ONLY using the provided context from their notes. " +
    "If the context does not contain the answer, say you don't know based on the notes.";

  const prompt = `Context from notes:\n${params.context}\n\nUser question: ${params.question}`;

  const res = await engine.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  const msg = res?.choices?.[0]?.message?.content;
  return (typeof msg === "string" ? msg : "").trim();
}
