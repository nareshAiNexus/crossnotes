function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isInsideCodeLike(ancestors: any[]) {
  return ancestors.some(
    (n) => n && n.type === "element" && (n.tagName === "code" || n.tagName === "pre")
  );
}

/**
 * Rehype plugin that wraps matching text segments in <mark class="kb-highlight">.
 * This avoids enabling raw HTML parsing.
 */
export function makeRehypeHighlighter(phrases: string[]) {
  const cleaned = Array.from(
    new Set(
      (phrases ?? [])
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((p) => p.length >= 4)
    )
  ).slice(0, 12);

  if (cleaned.length === 0) {
    return () => (tree: any) => tree;
  }

  const re = new RegExp(cleaned.map(escapeRegExp).join("|"), "gi");

  const markNode = (text: string) => ({
    type: "element",
    tagName: "mark",
    properties: { className: ["kb-highlight"] },
    children: [{ type: "text", value: text }],
  });

  const splitText = (value: string) => {
    const parts: any[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    re.lastIndex = 0;
    while ((m = re.exec(value))) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > lastIndex) {
        parts.push({ type: "text", value: value.slice(lastIndex, start) });
      }
      parts.push(markNode(value.slice(start, end)));
      lastIndex = end;
      if (re.lastIndex === m.index) re.lastIndex++; // safety
    }

    if (lastIndex < value.length) {
      parts.push({ type: "text", value: value.slice(lastIndex) });
    }

    return parts;
  };

  const walk = (node: any, ancestors: any[]) => {
    if (!node) return;

    if (node.type === "text" && typeof node.value === "string" && !isInsideCodeLike(ancestors)) {
      re.lastIndex = 0;
      if (!re.test(node.value)) return;

      const parent = ancestors[ancestors.length - 1];
      if (!parent || !Array.isArray(parent.children)) return;

      const idx = parent.children.indexOf(node);
      if (idx === -1) return;

      const replacement = splitText(node.value);
      parent.children.splice(idx, 1, ...replacement);
      return;
    }

    if (Array.isArray(node.children)) {
      // clone array since we may splice during traversal
      const kids = [...node.children];
      for (const child of kids) {
        walk(child, [...ancestors, node]);
      }
    }
  };

  return () => (tree: any) => {
    walk(tree, []);
    return tree;
  };
}
