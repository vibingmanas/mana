import { describe, it, expect } from 'vitest';
import { chunkText, stripMention } from './telegram';

describe('stripMention', () => {
  it('removes a leading bot mention', () => {
    expect(stripMention('@mana_dev fix the login bug', 'mana_dev')).toBe('fix the login bug');
  });
  it('is case-insensitive and leaves other text intact', () => {
    expect(stripMention('@Mana_Dev ship it now', 'mana_dev')).toBe('ship it now');
  });
  it('leaves text without a mention unchanged', () => {
    expect(stripMention('just a message', 'mana_dev')).toBe('just a message');
  });
});

describe('chunkText', () => {
  it('returns one chunk when under the limit', () => {
    expect(chunkText('hello', 100)).toEqual(['hello']);
  });
  it('splits long text into sized chunks', () => {
    const chunks = chunkText('a'.repeat(250), 100);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].length).toBe(100);
    expect(chunks.join('').length).toBe(250);
  });
});
