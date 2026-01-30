import { visit, SKIP } from "unist-util-visit";

/**
 * Convert single newlines inside normal text into mdast `break` nodes.
 * This makes markdown preview behave closer to a plain-text editor (like ChatGPT),
 * where pressing Enter creates a visible line break.
 */
export function remarkSoftbreaksToBreaks() {
  return (tree: any) => {
    visit(tree, "text", (node: any, index: any, parent: any) => {
      if (!parent || typeof index !== "number") return;

      const value = typeof node?.value === "string" ? node.value : "";
      if (!value.includes("\n")) return;

      // Don't interfere with code-like contexts.
      if (parent.type === "inlineCode" || parent.type === "code") return;

      const parts = value.split("\n");
      if (parts.length <= 1) return;

      const replacement: any[] = [];
      for (let i = 0; i < parts.length; i++) {
        const t = parts[i];
        if (t) replacement.push({ type: "text", value: t });
        if (i < parts.length - 1) replacement.push({ type: "break" });
      }

      parent.children.splice(index, 1, ...replacement);

      // Skip visiting the newly inserted nodes (prevents double-processing).
      return [SKIP, index + replacement.length];
    });

    return tree;
  };
}
