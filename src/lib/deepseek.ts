import { toast } from 'sonner';
import { chatWithGemini, isGeminiConfigured } from './gemini';

// Using OpenRouter API for DeepSeek R1
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek/deepseek-r1-0528:free';

export interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenRouterResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

function getOpenRouterApiKey(): string | undefined {
    // Backwards compatible:
    // - preferred: VITE_OPENROUTER_DEEPSEEK_API_KEY
    // - legacy:    VITE_DEEPSEEK_API_KEY
    return (
        import.meta.env.VITE_OPENROUTER_DEEPSEEK_API_KEY ||
        import.meta.env.VITE_DEEPSEEK_API_KEY
    );
}

export function isAIFormattingConfigured(): boolean {
    return !!getOpenRouterApiKey();
}

function stripCodeFences(text: string) {
    let out = text.trim();

    // Some models wrap markdown in ```markdown ... ``` which breaks rendering.
    if (out.startsWith('```markdown')) {
        out = out.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    } else if (out.startsWith('```')) {
        out = out.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return out.trim();
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Low-level OpenRouter chat helper with retry logic for rate limits.
 * Intentionally does NOT toast by default so it can be reused in non-UI flows (e.g. RAG chat).
 */
export async function chatWithAI(params: {
    messages: OpenRouterMessage[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
    maxRetries?: number;
}): Promise<string> {
    const apiKey = getOpenRouterApiKey();

    if (!apiKey) {
        throw new Error('API key not configured');
    }

    const maxRetries = params.maxRetries ?? 3;
    let lastError: Error | null = null;

    // Retry with exponential backoff
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'CrossNotes'
                },
                body: JSON.stringify({
                    model: params.model ?? DEEPSEEK_MODEL,
                    messages: params.messages,
                    temperature: params.temperature ?? 0.2,
                    max_tokens: params.max_tokens ?? 2500
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('OpenRouter API error:', errorData);

                // Handle rate limiting (429)
                if (response.status === 429) {
                    if (attempt < maxRetries) {
                        // Exponential backoff: 2s, 4s, 8s
                        const delayMs = Math.pow(2, attempt + 1) * 1000;
                        console.warn(`Rate limited (429). Retrying in ${delayMs / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
                        await sleep(delayMs);
                        continue; // Retry
                    } else {
                        throw new Error('Rate limit exceeded. The free API tier has request limits. Please wait a few minutes and try again.');
                    }
                }

                // Other errors - don't retry
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data: OpenRouterResponse = await response.json();

            const content = data?.choices?.[0]?.message?.content;
            const text = typeof content === 'string' ? content.trim() : '';
            if (!text) {
                throw new Error('Empty response from AI');
            }

            return stripCodeFences(text);

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // If it's not a rate limit error, don't retry
            if (!lastError.message.includes('Rate limit')) {
                throw lastError;
            }
        }
    }

    // If we exhausted all retries
    throw lastError || new Error('Failed after retries');
}

/**
 * Convenience wrapper for the RAG/KnowledgeBase chat.
 */
export async function answerWithAI(params: {
    system: string;
    user: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
}): Promise<string> {
    return chatWithAI({
        messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.user },
        ],
        model: params.model,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
    });
}

export async function formatNotesWithAI(content: string, option: 'format' | 'enhance' = 'enhance'): Promise<string> {
    if (!isGeminiConfigured()) {
        toast.error(
            'AI formatting is not configured. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server.'
        );
        throw new Error('API key not configured');
    }

    if (!content || content.trim().length === 0) {
        toast.error('No content to format');
        throw new Error('Empty content');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (option === 'format') {
        // Fast, minimal formatting
        systemPrompt = `You are an expert technical editor.
Your task is to STRICTLY format the user's notes using Markdown best practices.
Rules:
- Fix grammar, spelling, and punctuation errors.
- Ensure proper heading hierarchy (#, ##, ###).
- Formatting ONLY: bold (**text**), italics (*text*), code blocks.
- transform bullet points into lists.
- NO new content. NO emojis. NO images. NO filler text.
- Speed is priority. Keep it clean and minimal.
- Return ONLY the markdown.`;
        userPrompt = `Format this note strictly (fix grammar/structure only):\n\n${content}`;
    } else {
        // Enhanced, rich formatting (GitHub Style)
        systemPrompt = `You are an expert technical writer and markdown formatting professional. 
Format the user's notes into a clean, premium GitHub README / Documentation style.

Rules:
- Use # for h1, ## for h2, ### for h3. Maintain a clear and logical hierarchy.
- Use **text** for bold, *text* for italic.
- Use \`code\` for inline code and triple backticks with language identifiers for code blocks.
- Use relevant emojis at the start of each heading and occasionally in lists to improve scannability.
- Add logically relevant detailed image references using markdown syntax: ![Alt Text](https://image.pollinations.ai/prompt/<description>?width=800&height=450&nologo=true).
  - Example: ![Cyberpunk City](https://image.pollinations.ai/prompt/cyberpunk%20city%20neon%20lights?width=800&height=450&nologo=true)
  - Ensure the prompt in the URL is URL-encoded and descriptive.
  - STRICTLY FORBIDDEN: Do NOT use source.unsplash.com or any other image service. ONE AND ONLY use pollinations.ai.
- Use - for bullet lists and 1. for numbered lists.
- Use > for important callouts or quotes.
- Use --- for section separators.

Tasks:
- Fix grammar, punctuation, and spelling errors.
- Organize content into descriptive sections with clear headings.
- Add an introductory section if missing.
- Use tables for structured data if appropriate.
- Ensure the tone is professional yet engaging.

CRITICAL: Return ONLY the formatted markdown. Do NOT wrap it in extra code fences. Do NOT add meta-commentary. Just the clean, styled markdown.`;
        userPrompt = `Transform and format this note into a high-quality GitHub-style document:\n\n${content}`;
    }

    try {
        const formattedContent = await chatWithGemini({
            system: systemPrompt,
            user: userPrompt,
            temperature: 0.1,
            max_tokens: option === 'format' ? 1024 : 2048 // Lower token limit for fast mode
        });


        return formattedContent;
    } catch (error) {
        console.error('Error formatting notes:', error);
        if (error instanceof Error) {
            // Provide user-friendly message for rate limiting
            if (error.message.includes('Rate limit')) {
                toast.error('Rate limit exceeded. Please wait a few minutes before trying again. The free API has usage limits.');
            } else {
                toast.error(`Failed to format: ${error.message}`);
            }
        } else {
            toast.error('Failed to format notes');
        }
        throw error;
    }
}

