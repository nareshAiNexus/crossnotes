import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Automatically converts plain image URLs in text to markdown image syntax
 * if they are not already part of a markdown image or link.
 */
export function autoRenderImages(text: string): string {
  if (!text) return text;

  // Regex to find image-like URLs
  // 1. URLs ending in common image extensions (case insensitive)
  // 2. Pollinations.ai URLs
  // 3. Google thumbnail and images URLs
  const imageUrlRegex = /(https?:\/\/[^\s\)\>]+?\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s\)\>]+)?|https?:\/\/image\.pollinations\.ai\/prompt\/[^\s\)\>]+|https?:\/\/[^\s\)\>]*?(?:googleusercontent|gstatic|encrypted-tbn)[^\s\)\>]*)/gi;

  return text.replace(imageUrlRegex, (url, offset) => {
    // Check if it's already part of markdown or html
    // We look back to see if it's preceded by characters that indicate it's already handled
    const before = text.slice(Math.max(0, offset - 10), offset);
    const after = text.slice(offset + url.length, offset + url.length + 1);

    // Avoid double wrapping if:
    // - Already in markdown: ![](url) or ![] (url) or [link](url)
    // - Already in HTML: src="url" or <url>
    // - Already wrapped in parentheses: (url)
    const isWrapped = before.trim().endsWith('(') ||
      before.trim().endsWith('="') ||
      before.trim().endsWith('<') ||
      (before.includes('(') && !before.includes(')')) || // Rough check for unclosed paren
      after === ')' ||
      after === '>';

    if (isWrapped) {
      return url;
    }

    // Otherwise wrap it and ensure spaces are encoded
    const encodedUrl = url.replace(/ /g, '%20');
    return `![Image](${encodedUrl})`;
  });
}

/**
 * Robustly extracts text content from complex React children or AST nodes.
 * Useful for Mermaid diagrams where children may be an array of objects.
 */
export function getTextContent(children: any): string {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(getTextContent).join('');
  }
  // Handle React elements
  if (children.props && children.props.children) {
    return getTextContent(children.props.children);
  }
  // Handle plain objects / AST nodes
  if (typeof children === 'object' && children !== null) {
    if (children.value !== undefined) return String(children.value);
    if (children.content !== undefined) return getTextContent(children.content);
    if (children.props && children.props.children !== undefined) return getTextContent(children.props.children);

    // Explicitly return empty string for all other objects to prevent "[object Object]"
    return '';
  }
  return children === undefined || children === null ? '' : String(children);
}
