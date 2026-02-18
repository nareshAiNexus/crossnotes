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
 * Low-level OpenRouter chat helper.
 * Intentionally does NOT toast by default so it can be reused in non-UI flows (e.g. RAG chat).
 */
export async function chatWithAI(params: {
    messages: OpenRouterMessage[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
}): Promise<string> {
    const apiKey = getOpenRouterApiKey();

    if (!apiKey) {
        throw new Error('API key not configured');
    }

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
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: OpenRouterResponse = await response.json();

    const content = data?.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content.trim() : '';
    if (!text) {
        throw new Error('Empty response from AI');
    }

    return stripCodeFences(text);
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

export async function formatNotesWithAI(content: string): Promise<string> {
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

    const messages: OpenRouterMessage[] = [
        {
            role: 'system',
            content: `You are an expert technical writer and markdown formatting professional. 
Format the user's notes into a clean, premium GitHub README / Documentation style.

Rules:
- Use # for h1, ## for h2, ### for h3. Maintain a clear and logical hierarchy.
- Use **text** for bold, *text* for italic.
- Use \`code\` for inline code and triple backticks with language identifiers for code blocks.
- Use relevant emojis at the start of each heading and occasionally in lists to improve scannability.
- Add logically relevant detailed image references using markdown syntax: ![Alt Text](https://image.pollinations.ai/prompt/<description>?width=800&height=450&nologo=true).
  - Example: ![Cyberpunk City](https://image.pollinations.ai/prompt/cyberpunk%20city%20neon%20lights?width=800&height=450&nologo=true)
  - Ensure the prompt in the URL is URL-encoded and descriptive.
- Use - for bullet lists and 1. for numbered lists.
- Use > for important callouts or quotes.
- Use --- for section separators.

Tasks:
- Fix grammar, punctuation, and spelling errors.
- Organize content into descriptive sections with clear headings.
- Add an introductory section if missing.
- Use tables for structured data if appropriate.
- Ensure the tone is professional yet engaging.

CRITICAL: Return ONLY the formatted markdown. Do NOT wrap it in extra code fences. Do NOT add meta-commentary. Just the clean, styled markdown.`
        },
        {
            role: 'user',
            content: `Transform and format this note into a high-quality GitHub-style document:\n\n${content}`
        }
    ];

    try {
        const formattedContent = await chatWithGemini({
            system: messages[0].content,
            user: messages[1].content,
            temperature: 0.1,
            max_tokens: 2048
        });


        return formattedContent;
    } catch (error) {
        console.error('Error formatting notes:', error);
        if (error instanceof Error) {
            toast.error(`Failed to format: ${error.message}`);
        } else {
            toast.error('Failed to format notes');
        }
        throw error;
    }
}

