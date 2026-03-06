import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function compareSequences(seqA: string[], seqB: string[]): number {
  const len = Math.min(seqA.length, seqB.length);
  for (let i = 0; i < len; i++) {
    const valA = getBidValue(seqA[i]);
    const valB = getBidValue(seqB[i]);
    if (valA !== valB) return valA - valB;
  }
  return seqA.length - seqB.length;
}
