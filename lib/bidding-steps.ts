export type BiddingActor = 'our' | 'opp';

export interface BiddingStep {
  call: string;
  actor: BiddingActor;
}

const CALL_RE = /^([1-7](C|D|H|S|NT)|PASS|X|XX)$/i;

function normalizeActor(raw: unknown): BiddingActor {
  if (raw === 'opp' || raw === 'opponent' || raw === 'p') return 'opp';
  return 'our';
}

export function normalizeBiddingCall(raw: string): string | null {
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/♣/g, 'C')
    .replace(/♦/g, 'D')
    .replace(/♥/g, 'H')
    .replace(/♠/g, 'S')
    .replace(/\s+/g, '');

  if (!normalized) return null;
  if (!CALL_RE.test(normalized)) return null;

  if (normalized === 'PASS' || normalized === 'P') return 'Pass';
  if (normalized === 'X' || normalized === 'XX') return normalized;

  const match = normalized.match(/^([1-7])(C|D|H|S|NT)$/);
  if (!match) return null;
  return `${match[1]}${match[2]}`;
}

export function normalizeBiddingStep(raw: unknown): BiddingStep | null {
  if (typeof raw === 'string') {
    const token = raw.trim();
    if (!token) return null;
    const prefixed = token.match(/^([op]):(.+)$/i);
    if (prefixed) {
      const actor = prefixed[1].toLowerCase() === 'p' ? 'opp' : 'our';
      const call = normalizeBiddingCall(prefixed[2]);
      if (!call) return null;
      return { call, actor };
    }

    const call = normalizeBiddingCall(token);
    if (!call) return null;
    return { call, actor: 'our' };
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const maybeCall = (raw as { call?: unknown }).call;
    if (typeof maybeCall !== 'string') return null;
    const call = normalizeBiddingCall(maybeCall);
    if (!call) return null;
    return {
      call,
      actor: normalizeActor((raw as { actor?: unknown }).actor),
    };
  }

  return null;
}

export function normalizeStepSequence(raw: unknown): BiddingStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => normalizeBiddingStep(value))
    .filter((step): step is BiddingStep => !!step);
}

export function encodeBiddingStepToken(step: BiddingStep): string {
  return `${step.actor === 'opp' ? 'p' : 'o'}:${step.call}`;
}

export function buildSequenceIdFromSteps(steps: BiddingStep[]): string {
  return steps.map((step) => encodeBiddingStepToken(step)).join(' ');
}

export function parseSequenceIdToSteps(sequenceId: string): BiddingStep[] {
  return sequenceId
    .split(' ')
    .map((token) => normalizeBiddingStep(token))
    .filter((step): step is BiddingStep => !!step);
}

export function toLegacyCallSequence(steps: BiddingStep[]): string[] {
  return steps.map((step) => step.call);
}

export function canonicalizeNodeId(input: string): string {
  const steps = parseSequenceIdToSteps(input);
  if (steps.length === 0) return input.trim();
  return buildSequenceIdFromSteps(steps);
}
