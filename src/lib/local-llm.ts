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
  system: string;
  user: string;
  onProgressText?: (t: string) => void;
  temperature?: number;
}): Promise<string> {
  if (!isWebGPUAvailable()) {
    throw new Error("WebGPU is not available on this device/browser");
  }

  const engine = await initLocalLLM({ onProgress: params.onProgressText });

  const res = await engine.chat.completions.create({
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
    temperature: params.temperature ?? 0.2,
  });

  const msg = res?.choices?.[0]?.message?.content;
  return (typeof msg === "string" ? msg : "").trim();
}
