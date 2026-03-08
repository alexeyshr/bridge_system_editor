import { buildSequenceIdFromSteps, type BiddingStep } from '@/lib/bidding-steps';

export const SYSTEM_TEMPLATE_IDS = ['standard', 'two_over_one', 'precision'] as const;
export type SystemTemplateId = (typeof SYSTEM_TEMPLATE_IDS)[number];

export interface SystemTemplateProfile {
  id: SystemTemplateId;
  name: string;
  description: string;
  defaultTitle: string;
  defaultDescription: string;
  nodeCount: number;
}

export interface SystemTemplateSeedNode {
  sequenceId: string;
  payload: {
    context: {
      sequence: BiddingStep[];
    };
    meaning: Record<string, unknown>;
    isExpanded: boolean;
    isBookmarked: boolean;
  };
}

interface SystemTemplateDefinition {
  id: SystemTemplateId;
  name: string;
  description: string;
  defaultTitle: string;
  defaultDescription: string;
  nodes: SystemTemplateSeedNode[];
}

function createOurSequence(...calls: string[]): BiddingStep[] {
  return calls.map((call) => ({ call, actor: 'our' as const }));
}

function createNode(calls: string[], meaning: Record<string, unknown>): SystemTemplateSeedNode {
  const sequence = createOurSequence(...calls);
  return {
    sequenceId: buildSequenceIdFromSteps(sequence),
    payload: {
      context: { sequence },
      meaning,
      isExpanded: sequence.length <= 2,
      isBookmarked: false,
    },
  };
}

const SYSTEM_TEMPLATES: Record<SystemTemplateId, SystemTemplateDefinition> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Balanced baseline with natural one-level opening structure.',
    defaultTitle: 'Standard System',
    defaultDescription: 'Bootstrap profile: Standard natural structure.',
    nodes: [
      createNode(['1C'], {
        type: 'opening',
        forcing: 'NF',
        hcp: { min: 12, max: 21 },
        notes: 'Natural club opening.',
        accepted: true,
      }),
      createNode(['1C', '1D'], {
        type: 'response',
        forcing: 'F1',
        hcp: { min: 6, max: '' },
        notes: 'Natural diamond response.',
        accepted: true,
      }),
      createNode(['1C', '1D', '1H'], {
        type: 'rebid',
        forcing: 'NF',
        hcp: { min: 11, max: 16 },
        notes: 'Natural heart rebid.',
      }),
      createNode(['1NT'], {
        type: 'opening',
        forcing: 'NF',
        hcp: { min: 15, max: 17 },
        notes: 'Balanced notrump opening.',
        accepted: true,
      }),
      createNode(['1NT', '2C'], {
        type: 'response',
        forcing: 'F1',
        notes: 'Stayman inquiry.',
      }),
    ],
  },
  two_over_one: {
    id: 'two_over_one',
    name: '2/1',
    description: 'Game-forcing 2/1 profile with natural setup.',
    defaultTitle: '2/1 Game Force System',
    defaultDescription: 'Bootstrap profile: 2/1 game forcing structure.',
    nodes: [
      createNode(['1C'], {
        type: 'opening',
        forcing: 'NF',
        hcp: { min: 12, max: 21 },
        notes: 'Natural club opening (2/1 style).',
        accepted: true,
      }),
      createNode(['1C', '1H'], {
        type: 'response',
        forcing: 'F1',
        hcp: { min: 6, max: '' },
        notes: 'One-over-one response.',
      }),
      createNode(['1C', '1H', '2D'], {
        type: 'rebid',
        forcing: 'FG',
        notes: '2/1 game-forcing continuation.',
      }),
      createNode(['1D'], {
        type: 'opening',
        forcing: 'NF',
        hcp: { min: 12, max: 21 },
        notes: 'Natural diamond opening.',
        accepted: true,
      }),
      createNode(['1D', '1S', '2C'], {
        type: 'rebid',
        forcing: 'FG',
        notes: '2/1 style game-force sequence.',
      }),
    ],
  },
  precision: {
    id: 'precision',
    name: 'Precision',
    description: 'Strong club precision baseline with limited diamond opening.',
    defaultTitle: 'Precision System',
    defaultDescription: 'Bootstrap profile: Precision strong club structure.',
    nodes: [
      createNode(['1C'], {
        type: 'opening',
        forcing: 'FG',
        hcp: { min: 16, max: '' },
        notes: 'Strong artificial club.',
        accepted: true,
      }),
      createNode(['1C', '1D'], {
        type: 'response',
        forcing: 'FG',
        notes: 'Negative/relay response.',
        accepted: true,
      }),
      createNode(['1C', '1D', '1H'], {
        type: 'rebid',
        forcing: 'FG',
        notes: 'Relay continuation after strong club.',
      }),
      createNode(['1D'], {
        type: 'opening',
        forcing: 'NF',
        hcp: { min: 11, max: 15 },
        notes: 'Limited natural/short diamond opening.',
      }),
      createNode(['1D', '1H'], {
        type: 'response',
        forcing: 'F1',
        notes: 'Natural major response.',
      }),
    ],
  },
};

function cloneSeed(nodes: SystemTemplateSeedNode[]): SystemTemplateSeedNode[] {
  return JSON.parse(JSON.stringify(nodes)) as SystemTemplateSeedNode[];
}

export function listSystemTemplateProfiles(): SystemTemplateProfile[] {
  return SYSTEM_TEMPLATE_IDS.map((id) => {
    const template = SYSTEM_TEMPLATES[id];
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      defaultTitle: template.defaultTitle,
      defaultDescription: template.defaultDescription,
      nodeCount: template.nodes.length,
    };
  });
}

export function getSystemTemplateProfile(templateId: SystemTemplateId): SystemTemplateProfile {
  const template = SYSTEM_TEMPLATES[templateId];
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    defaultTitle: template.defaultTitle,
    defaultDescription: template.defaultDescription,
    nodeCount: template.nodes.length,
  };
}

export function getSystemTemplateSeed(templateId: SystemTemplateId): SystemTemplateSeedNode[] {
  const template = SYSTEM_TEMPLATES[templateId];
  return cloneSeed(template.nodes);
}
