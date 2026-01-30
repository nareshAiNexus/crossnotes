import { toast } from 'sonner';

// Using OpenRouter API for DeepSeek R1 Chimera
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'tngtech/deepseek-r1t2-chimera:free';

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
    const apiKey = getOpenRouterApiKey();

    if (!apiKey) {
        toast.error(
            'AI formatting is not configured. Add VITE_OPENROUTER_DEEPSEEK_API_KEY (or VITE_DEEPSEEK_API_KEY) to your .env file and restart the dev server.'
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
            content: `You are a markdown formatting expert. Format the user's notes into clean, proper markdown.

Rules:
- Use # for h1, ## for h2, ### for h3, etc.
- Use **text** for bold
- Use *text* for italic  
- Use \`code\` for inline code
- Use triple backticks for code blocks
- Use - or * for bullet lists
- Use 1. 2. 3. for numbered lists
- Use > for blockquotes
- Use --- for horizontal rules

Tasks:
- Fix markdown syntax errors
- Create clear heading hierarchy
- Organize content logically
- Add proper spacing between sections
- Use bold/italic for emphasis
- Format code blocks properly
- Create lists where appropriate
- Fix grammar and punctuation

CRITICAL: Return ONLY the formatted markdown. Do NOT wrap it in code blocks. Do NOT add explanations. Just return the clean markdown that will render correctly.`
        },
        {
            role: 'user',
            content: `Format this note:\n\n${content}`
        }
    ];

    try {
        const formattedContent = await chatWithAI({
            messages,
            temperature: 0.7,
            max_tokens: 4000
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
