import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { BiddingStep } from "@/lib/bidding-steps"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCall(call: string) {
  // Replace C, D, H, S with symbols
  return call
    .replace(/C/g, '♣')
    .replace(/D/g, '♦')
    .replace(/H/g, '♥')
    .replace(/S/g, '♠');
}

export function getSuitColor(call: string) {
  if (call.includes('C') || call.includes('♣')) return 'text-emerald-600';
  if (call.includes('D') || call.includes('♦')) return 'text-blue-600';
  if (call.includes('H') || call.includes('♥')) return 'text-red-600';
  if (call.includes('S') || call.includes('♠')) return 'text-slate-900';
  if (call.includes('NT')) return 'text-slate-500';
  return 'text-slate-700';
}

const suitsOrder = ['C', 'D', 'H', 'S', 'NT'];
const specialCalls = ['Pass', 'X', 'XX'];

export function getBidValue(call: string): number {
  if (specialCalls.includes(call)) {
    return specialCalls.indexOf(call) - 100; // Pass, X, XX are lowest
  }
  const match = call.match(/^(\d)(C|D|H|S|NT)$/);
  if (!match) return 999; // Unknown
  const level = parseInt(match[1], 10);
  const suit = match[2];
  return level * 10 + suitsOrder.indexOf(suit);
}

type SequenceEntry = string | BiddingStep;

function toComparableStep(value: SequenceEntry): { call: string; actor: 'our' | 'opp' } {
  if (typeof value !== 'string') {
    return {
      call: value.call,
      actor: value.actor === 'opp' ? 'opp' : 'our',
    };
  }

  const trimmed = value.trim();
  const prefixed = trimmed.match(/^([op]):(.+)$/i);
  if (prefixed) {
    return {
      call: prefixed[2],
      actor: prefixed[1].toLowerCase() === 'p' ? 'opp' : 'our',
    };
  }

  return {
    call: trimmed,
    actor: 'our',
  };
}

export function compareStepSequences(seqA: SequenceEntry[], seqB: SequenceEntry[]): number {
  const len = Math.min(seqA.length, seqB.length);
  for (let i = 0; i < len; i++) {
    const stepA = toComparableStep(seqA[i]);
    const stepB = toComparableStep(seqB[i]);
    const valA = getBidValue(stepA.call);
    const valB = getBidValue(stepB.call);
    if (valA !== valB) return valA - valB;
    if (stepA.actor !== stepB.actor) return stepA.actor === 'our' ? -1 : 1;
  }
  return seqA.length - seqB.length;
}

export function compareSequences(seqA: SequenceEntry[], seqB: SequenceEntry[]): number {
  return compareStepSequences(seqA, seqB);
}
