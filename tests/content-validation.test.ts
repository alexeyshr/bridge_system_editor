import assert from 'node:assert/strict';
import test from 'node:test';

import {
  contentBlocksSchema,
  createContentItemSchema,
  updateContentDraftSchema,
} from '../lib/validation/content';

test('content block schema accepts mixed block payload', () => {
  const parsed = contentBlocksSchema.safeParse([
    { type: 'text', markdown: '## Bridge note' },
    { type: 'callout', tone: 'info', text: 'Forcing for one round.' },
    {
      type: 'deal',
      board: '17',
      dealer: 'N',
      vulnerability: 'ns',
      hands: {
        north: { spades: 'AKQ', hearts: 'T98', diamonds: '72', clubs: 'AQJ' },
      },
    },
    { type: 'auction', sequence: ['1C', '1D', '1H'] },
    { type: 'answer', text: 'Use this rebid with 11-16 HCP.' },
  ]);
  assert.equal(parsed.success, true);
});

test('create content rejects invalid external link without URL', () => {
  const parsed = createContentItemSchema.safeParse({
    spaceId: 'space-1',
    title: 'Hidden gem',
    format: 'article',
    visibility: 'members_only',
    blocks: [{ type: 'text', markdown: 'Body' }],
    links: [{ targetType: 'external', label: 'No url' }],
  });

  assert.equal(parsed.success, false);
});

test('update content requires at least one field', () => {
  const parsed = updateContentDraftSchema.safeParse({});
  assert.equal(parsed.success, false);
});

test('deal block accepts source URL without hands', () => {
  const parsed = contentBlocksSchema.safeParse([
    {
      type: 'deal',
      sourceUrl: 'https://example.com/deal/42',
    },
  ]);
  assert.equal(parsed.success, true);
});

test('deal block rejects empty payload without hands or source URL', () => {
  const parsed = contentBlocksSchema.safeParse([
    {
      type: 'deal',
      board: '3',
    },
  ]);
  assert.equal(parsed.success, false);
});
