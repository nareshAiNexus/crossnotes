import React from 'react';

/**
 * Handles IDE-like features for a raw textarea:
 * - Auto-pairing for brackets (), {}, [], and quotes "", ''
 * - Auto-tag completion for HTML tags
 * - Auto-indentation on Enter
 */
export const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    onContentChange: (value: string) => void
) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    // 1. Auto-pairing
    const pairs: Record<string, string> = {
        '(': ')',
        '{': '}',
        '[': ']',
        '"': '"',
        "'": "'",
    };

    if (pairs[e.key]) {
        e.preventDefault();
        const pair = pairs[e.key];
        const newValue =
            value.substring(0, selectionStart) +
            e.key +
            pair +
            value.substring(selectionEnd);

        onContentChange(newValue);

        // Set cursor position after the opening char
        setTimeout(() => {
            textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
        }, 0);
        return;
    }

    // 2. Auto-tag completion (e.g., <div> -> </div>)
    if (e.key === '>') {
        const lastOpenTagMatch = value.substring(0, selectionStart).match(/<([a-zA-Z1-6]+)$/);
        if (lastOpenTagMatch) {
            // It's a valid opening tag candidate
            const tagName = lastOpenTagMatch[1];

            // Don't auto-close self-closing tags (basic list)
            const selfClosing = ['img', 'br', 'hr', 'input', 'link', 'meta'];
            if (!selfClosing.includes(tagName.toLowerCase())) {
                e.preventDefault();
                const newValue =
                    value.substring(0, selectionStart) +
                    '>' +
                    `</${tagName}>` +
                    value.substring(selectionEnd);

                onContentChange(newValue);

                setTimeout(() => {
                    textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
                }, 0);
                return;
            }
        }
    }

    // 3. Auto-indent on Enter
    if (e.key === 'Enter') {
        // Get current line to determine indentation
        const lines = value.substring(0, selectionStart).split('\n');
        const currentLine = lines[lines.length - 1];
        const indentationMatch = currentLine.match(/^(\s+)/);

        if (indentationMatch) {
            e.preventDefault();
            const indentation = indentationMatch[1];
            const newValue =
                value.substring(0, selectionStart) +
                '\n' +
                indentation +
                value.substring(selectionEnd);

            onContentChange(newValue);

            setTimeout(() => {
                textarea.setSelectionRange(selectionStart + 1 + indentation.length, selectionStart + 1 + indentation.length);
            }, 0);
            return;
        }
    }

    // 4. Tab expansion (Emmet-like) for tags
    if (e.key === 'Tab') {
        const lines = value.substring(0, selectionStart).split('\n');
        const currentLine = lines[lines.length - 1];
        const wordMatch = currentLine.match(/([a-zA-Z1-6]+)$/);

        if (wordMatch) {
            const tagName = wordMatch[1];
            const commonTags = [
                'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'section', 'article', 'nav', 'header', 'footer', 'main',
                'ul', 'ol', 'li', 'button', 'a', 'b', 'i', 'em', 'strong',
                'table', 'tr', 'td', 'th', 'form', 'label'
            ];

            if (commonTags.includes(tagName.toLowerCase())) {
                e.preventDefault();
                const start = selectionStart - tagName.length;
                const newValue =
                    value.substring(0, start) +
                    `<${tagName}></${tagName}>` +
                    value.substring(selectionEnd);

                onContentChange(newValue);

                setTimeout(() => {
                    textarea.setSelectionRange(start + tagName.length + 2, start + tagName.length + 2);
                }, 0);
                return;
            }
        }

        // Fallback: Normal Tab behavior (insert 4 spaces)
        e.preventDefault();
        const spaces = '    ';
        const newValue =
            value.substring(0, selectionStart) +
            spaces +
            value.substring(selectionEnd);

        onContentChange(newValue);

        setTimeout(() => {
            textarea.setSelectionRange(selectionStart + spaces.length, selectionStart + spaces.length);
        }, 0);
    }
};
