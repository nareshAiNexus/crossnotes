import { toast } from 'sonner';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
// Use v1beta for stability. We will manually handle system instructions by prepending them to the prompt.
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

export async function chatWithGemini(params: {
    system?: string;
    user: string;
    temperature?: number;
    max_tokens?: number;
}): Promise<string> {
    if (!API_KEY) {
        throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');
    }

    // Construct content parts. 
    // Note: v1beta supports systemInstruction, but sometimes model aliases rely on specific versions.
    // If v1beta fails with 404 for the model, it might be an alias issue. 
    // However, the user reported 404 for v1beta with gemini-1.5-flash.

    const parts = [];
    if (params.system) {
        // Prepend system prompt to user content to ensure it works across all model versions/endpoints
        parts.push({ text: `System Instructions:\n${params.system}\n\nUser Request:\n` });
    }
    parts.push({ text: params.user });

    const payload = {
        contents: [
            {
                role: 'user',
                parts: parts
            }
        ],
        generationConfig: {
            temperature: params.temperature ?? 0.4,
            maxOutputTokens: params.max_tokens ?? 1024,
        },
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API error:', JSON.stringify(errorData, null, 2));
            throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            console.error('Unexpected Gemini response structure:', data);
            throw new Error('Empty response from Gemini');
        }

        return content.trim();
    } catch (error) {
        console.error('Error in chatWithGemini:', error);
        throw error;
    }
}


/**
 * Convenience wrapper for RAG
 */
export async function answerWithGemini(params: {
    system: string;
    user: string;
    temperature?: number;
    max_tokens?: number;
}): Promise<string> {
    return chatWithGemini(params);
}

export function isGeminiConfigured(): boolean {
    return !!API_KEY;
}
