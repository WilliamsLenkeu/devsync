import { describe, expect, it } from 'vitest';
import { insertMention, mentionQuery, parseMentions } from './mentions';

describe('parseMentions', () => {
  it('splits text and @[Name](user:id) tokens', () => {
    expect(parseMentions('Hey @[Ada](user:u1), look')).toEqual([
      { kind: 'text', value: 'Hey ' },
      { kind: 'mention', name: 'Ada', userId: 'u1' },
      { kind: 'text', value: ', look' },
    ]);
    expect(parseMentions('plain')).toEqual([{ kind: 'text', value: 'plain' }]);
  });
});

describe('mentionQuery / insertMention', () => {
  it('detects a trailing @query and inserts a token', () => {
    expect(mentionQuery('Hello @Ad')).toBe('Ad');
    expect(mentionQuery('Hello @Ada ')).toBeNull();
    expect(insertMention('Hello @Ad', { id: 'u1', name: 'Ada' })).toBe('Hello @[Ada](user:u1) ');
  });
});
