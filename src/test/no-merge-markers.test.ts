import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFLICT_MARKER = /^(<<<<<<<|=======|>>>>>>>) /m;

describe('source files', () => {
  it('do not contain merge conflict markers in Index page', () => {
    const indexPath = join(process.cwd(), 'src', 'pages', 'Index.tsx');
    const content = readFileSync(indexPath, 'utf8');
    expect(CONFLICT_MARKER.test(content)).toBe(false);
  });
});
