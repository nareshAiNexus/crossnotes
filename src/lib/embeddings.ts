import { env, pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

// In browser builds, Transformers.js may try to load models from env.localModelPath (defaults to "/models/").
// When that path doesn't exist in our Vite app, the dev server returns index.html, which then triggers
// "Unexpected token '<' ... is not valid JSON" while the library tries to parse config/tokenizer JSON.
//
// We want hosted models by default.
env.allowLocalModels = false;

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null;

export async function initEmbedder(onProgress?: (p: number) => void) {
  if (!embedderPromise) {
    embedderPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      progress_callback: (progress: any) => {
        // xenova progress shape varies; this tries to normalize to 0..1
        const v =
          typeof progress === "number"
            ? progress
            : typeof progress?.progress === "number"
              ? progress.progress
              : typeof progress?.ratio === "number"
                ? progress.ratio
                : undefined;
        if (typeof v === "number") {
          onProgress?.(Math.max(0, Math.min(1, v)));
        }
      },
    }) as unknown as Promise<FeatureExtractionPipeline>;
  }
  return embedderPromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await initEmbedder();
  const output: any = await model(text, { pooling: "mean", normalize: true });
  // output.data is a Float32Array
  return Array.from(output.data as Float32Array);
}

export const EMBEDDING_DIM = 384;
