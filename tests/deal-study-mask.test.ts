import assert from 'node:assert/strict';
import test from 'node:test';

import { __dealStudyTestUtils } from '../lib/server/deal-study-service';

test('applyMaskToHands hides full seat and specific card ranks for readers', () => {
  const hands = __dealStudyTestUtils.normalizeHands({
    W: { S: 'AKQ', H: 'JT9', D: '876', C: '543' },
    N: { S: 'T98', H: '765', D: '432', C: 'AKQ' },
    E: { S: 'J76', H: 'KQ2', D: 'A95', C: 'T84' },
    S: { S: '543', H: 'A84', D: 'KQJ', C: '976' },
  });
  const mask = __dealStudyTestUtils.normalizeMask({
    hiddenSeats: ['E'],
    hiddenCards: [
      { seat: 'W', suit: 'S', rank: 'A' },
      { seat: 'N', suit: 'C', rank: 'A' },
    ],
  });

  const viewer = __dealStudyTestUtils.applyMaskToHands(hands, mask, false);
  assert.equal(viewer.E.S, 'HIDDEN');
  assert.equal(viewer.E.H, 'HIDDEN');
  assert.equal(viewer.W.S.includes('•'), true);
  assert.equal(viewer.N.C.includes('•'), true);

  const editor = __dealStudyTestUtils.applyMaskToHands(hands, mask, true);
  assert.equal(editor.E.S, 'J76');
  assert.equal(editor.W.S, 'AKQ');
});

test('validateHandsForDeckConflicts reports duplicate cards', () => {
  const hands = __dealStudyTestUtils.normalizeHands({
    W: { S: 'AKQ', H: '', D: '', C: '' },
    N: { S: 'A', H: '', D: '', C: '' },
    E: { S: '', H: '', D: '', C: '' },
    S: { S: '', H: '', D: '', C: '' },
  });

  const issues = __dealStudyTestUtils.validateHandsForDeckConflicts(hands);
  assert.equal(issues.length > 0, true);
  assert.match(issues[0] ?? '', /Duplicate card/i);
});

