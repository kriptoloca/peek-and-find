import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * CLAUDE.md rule 8: store text never uses "kids", "children", "toddler", "baby" (the game is
 * general audience 13+, never "made for kids"). Applies to everything under docs/store/.
 */
const DIR = join(__dirname, '..', 'docs', 'store');
const FORBIDDEN = /\b(kids?|child(?:ren)?|toddlers?|bab(?:y|ies)|preschool(?:ers?)?)\b/i;

describe('store text', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));

  it('has the listing, the thumbnail brief, the video script and the submission notes', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'listing.md',
        'thumbnail-brief.md',
        'video-script.md',
        'submission.md',
      ]),
    );
  });

  for (const f of files) {
    it(`${f} never targets a young audience by wording`, () => {
      const text = readFileSync(join(DIR, f), 'utf8');
      const hit = FORBIDDEN.exec(text);
      expect(hit, hit ? `"${hit[0]}" in ${f}` : '').toBeNull();
    });
  }

  it('the listing has a title, a one-line pitch, a three-line description and five tags', () => {
    const text = readFileSync(join(DIR, 'listing.md'), 'utf8');
    expect(text).toMatch(/^## Title\n+Peek & Find/m);
    const pitch = /^## One-line pitch\n+([^\n]+)/m.exec(text);
    expect(pitch?.[1]?.length ?? 0).toBeLessThanOrEqual(90);
    const desc = /^## Description\n+((?:[^\n]+\n?){3})/m.exec(text);
    expect(desc?.[1]?.trim().split('\n').length).toBe(3);
    const tags = /^## Tags\n+([^\n]+)/m.exec(text);
    expect(
      tags?.[1]
        ?.split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ).toHaveLength(5);
  });
});
