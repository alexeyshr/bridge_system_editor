export type BiddingMutationIntent =
  | 'delete-node'
  | 'remove-root-entry'
  | 'remove-node-section'
  | 'remove-subtree-rule';

export interface MutationIntentUiMeta {
  title: string;
  confirmLabel: string;
  confirmButtonClassName: string;
  isDestructive: boolean;
}

const MUTATION_INTENT_META: Record<BiddingMutationIntent, MutationIntentUiMeta> = {
  'delete-node': {
    title: 'Delete sequence?',
    confirmLabel: 'Delete',
    confirmButtonClassName: 'bg-red-600 hover:bg-red-700',
    isDestructive: true,
  },
  'remove-root-entry': {
    title: 'Remove root entry?',
    confirmLabel: 'Remove',
    confirmButtonClassName: 'bg-blue-600 hover:bg-blue-700',
    isDestructive: false,
  },
  'remove-node-section': {
    title: 'Remove section link?',
    confirmLabel: 'Remove',
    confirmButtonClassName: 'bg-blue-600 hover:bg-blue-700',
    isDestructive: false,
  },
  'remove-subtree-rule': {
    title: 'Remove subtree rule?',
    confirmLabel: 'Remove',
    confirmButtonClassName: 'bg-blue-600 hover:bg-blue-700',
    isDestructive: false,
  },
};

export function getMutationIntentUiMeta(intent: BiddingMutationIntent): MutationIntentUiMeta {
  return MUTATION_INTENT_META[intent];
}

export function isDestructiveMutationIntent(intent: BiddingMutationIntent): boolean {
  return MUTATION_INTENT_META[intent].isDestructive;
}
