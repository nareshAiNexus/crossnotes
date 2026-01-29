import { toast } from 'sonner';

// Using OpenRouter API for DeepSeek R1 Chimera
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'tngtech/deepseek-r1t2-chimera:free';

interface DeepSeekMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface DeepSeekResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export async function formatNotesWithAI(content: string): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENROUTER_DEEPSEEK_API_KEY;

    if (!apiKey) {
        toast.error('OpenRouter API key not found. Please add VITE_OPENROUTER_DEEPSEEK_API_KEY to your .env file');
        throw new Error('API key not configured');
    }

    if (!content || content.trim().length === 0) {
        toast.error('No content to format');
        throw new Error('Empty content');
    }

    const messages: DeepSeekMessage[] = [
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
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'CrossNotes'
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('DeepSeek API error:', errorData);
            toast.error(`API Error: ${response.status} ${response.statusText}`);
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data: DeepSeekResponse = await response.json();

        if (!data.choices || data.choices.length === 0) {
            toast.error('No response from AI');
            throw new Error('Invalid API response');
        }

        let formattedContent = data.choices[0].message.content.trim();

        if (!formattedContent) {
            toast.error('AI returned empty content');
            throw new Error('Empty response from AI');
        }

        // Clean up the response - remove code block wrappers if AI added them
        // Some models wrap markdown in ```markdown ... ``` which breaks rendering
        if (formattedContent.startsWith('```markdown')) {
            formattedContent = formattedContent.replace(/^```markdown\n/, '').replace(/\n```$/, '');
        } else if (formattedContent.startsWith('```')) {
            formattedContent = formattedContent.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        // Remove any leading/trailing whitespace again after cleaning
        formattedContent = formattedContent.trim();

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
