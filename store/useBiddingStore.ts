import { create } from 'zustand';
import yaml from 'js-yaml';

export interface BiddingNode {
  id: string;
  context: {
    sequence: string[];
  };
  meaning?: {
    type?: string;
    forcing?: string;
    natural?: boolean;
    alert?: boolean;
    hcp?: {
      min?: number | string;
      max?: number | string;
    };
    shape?: {
      S?: string;
      H?: string;
      D?: string;
      C?: string;
      balanced?: boolean;
      patterns?: string[];
      constraints?: string[];
    };
    shows?: string[];
    notes?: string;
    accepted?: boolean;
    comments?: {
      text: string;
      author: string;
      timestamp: string;
    }[];
  };
  // UI state
  isExpanded?: boolean;
  isBookmarked?: boolean;
}

interface BiddingState {
  nodes: Record<string, BiddingNode>;
  selectedNodeId: string | null;
  searchQuery: string;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  
  // Actions
  importYaml: (yamlString: string) => void;
  exportYaml: () => string;
  addNode: (parentId: string | null, call: string) => void;
  updateNode: (id: string, updates: Partial<BiddingNode>) => void;
  renameNode: (id: string, newCall: string) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  toggleExpand: (id: string) => void;
  setSearchQuery: (query: string) => void;
  toggleBookmark: (id: string) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToDepth: (depth: number) => void;
}

const defaultSystem = `
- id: "1C"
  context:
    sequence: ["1C"]
  meaning:
    type: opening
    forcing: NF
    hcp:
      min: 12
      max: 21
    notes: "Base opening. Includes weak NT without major."
    accepted: true
- id: "1C 1D"
  context:
    sequence: ["1C", "1D"]
  meaning:
    type: response
    forcing: F1
    hcp:
      min: 5
      max: ""
- id: "1C 1D 1H"
  context:
    sequence: ["1C", "1D", "1H"]
  meaning:
    type: rebid
    forcing: NF
    hcp:
      min: 11
      max: 16
    accepted: true
- id: "1C 1D 1H 1S"
  context:
    sequence: ["1C", "1D", "1H", "1S"]
  meaning:
    type: response
    forcing: F1
    alert: true
    hcp:
      min: 10
      max: ""
    accepted: true
- id: "1C 1D 1H 1NT"
  context:
    sequence: ["1C", "1D", "1H", "1NT"]
  meaning:
    type: response
    forcing: NF
    hcp:
      min: 6
      max: 10
    shows:
      - "Weak/medium NT response without fit"
    notes: ""
- id: "1C 1D 1H 2D"
  context:
    sequence: ["1C", "1D", "1H", "2D"]
  meaning:
    type: response
    forcing: NF
    hcp:
      min: 5
      max: 9
`;

// Parse default system synchronously
let initialNodes: Record<string, BiddingNode> = {};
try {
  const parsed = yaml.load(defaultSystem) as any[];
  if (Array.isArray(parsed)) {
    parsed.forEach(node => {
      if (node.id && node.context?.sequence) {
        initialNodes[node.id] = {
          ...node,
          isExpanded: true,
          isBookmarked: false
        };
      }
    });
  }
} catch (e) {
  console.error("Failed to parse default system", e);
}

export const useBiddingStore = create<BiddingState>((set, get) => ({
  nodes: initialNodes,
  selectedNodeId: null,
  searchQuery: '',
  isLeftPanelOpen: true,
  isRightPanelOpen: true,

  importYaml: (yamlString: string) => {
    try {
      const parsed = yaml.load(yamlString) as any[];
      if (!Array.isArray(parsed)) throw new Error("Invalid YAML format: expected an array of nodes.");
      
      const newNodes: Record<string, BiddingNode> = {};
      parsed.forEach(node => {
        if (node.id && node.context && node.context.sequence) {
          // Default to expanded for root and 1st level
          const isExpanded = node.context.sequence.length <= 2;
          newNodes[node.id] = { ...node, isExpanded };
        }
      });
      set({ nodes: newNodes, selectedNodeId: null });
    } catch (e) {
      console.error("Failed to parse YAML", e);
      alert("Failed to parse YAML");
    }
  },

  exportYaml: () => {
    const { nodes } = get();
    // Strip UI state before export
    const exportData = Object.values(nodes).map(node => {
      const { isExpanded, isBookmarked, ...rest } = node;
      return rest;
    });
    return yaml.dump(exportData);
  },

  addNode: (parentId: string | null, call: string) => {
    set(state => {
      const parentNode = parentId ? state.nodes[parentId] : null;
      const sequence = parentNode ? [...parentNode.context.sequence, call] : [call];
      const id = sequence.join(" ");
      
      if (state.nodes[id]) return state; // Already exists
      
      const newNode: BiddingNode = {
        id,
        context: { sequence },
        meaning: {
          type: 'response',
          forcing: 'NF',
          hcp: { min: '', max: '' }
        },
        isExpanded: true
      };
      
      // Expand parent
      const updatedNodes = { ...state.nodes, [id]: newNode };
      if (parentId && updatedNodes[parentId]) {
        updatedNodes[parentId] = { ...updatedNodes[parentId], isExpanded: true };
      }
      
      return { nodes: updatedNodes, selectedNodeId: id };
    });
  },

  updateNode: (id: string, updates: Partial<BiddingNode>) => {
    set(state => {
      if (!state.nodes[id]) return state;
      
      return {
        nodes: {
          ...state.nodes,
          [id]: { ...state.nodes[id], ...updates }
        }
      };
    });
  },

  renameNode: (id: string, newCall: string) => {
    set(state => {
      if (!state.nodes[id]) return state;
      
      const node = state.nodes[id];
      const oldSequence = [...node.context.sequence];
      const newSequence = [...oldSequence];
      newSequence[newSequence.length - 1] = newCall;
      
      const newId = newSequence.join(" ");
      
      // If the new ID already exists, don't overwrite it
      if (state.nodes[newId] && newId !== id) {
        alert("A sequence with this call already exists.");
        return state;
      }

      const newNodes = { ...state.nodes };
      
      // We need to rename this node AND all its children
      // For example, if we rename "1C 1D" to "1C 1H", 
      // then "1C 1D 1S" must become "1C 1H 1S"
      
      const prefix = id + " ";
      const newPrefix = newId + " ";
      
      Object.keys(state.nodes).forEach(key => {
        if (key === id) {
          // Rename the target node
          newNodes[newId] = {
            ...state.nodes[id],
            id: newId,
            context: {
              ...state.nodes[id].context,
              sequence: newSequence
            }
          };
          delete newNodes[id];
        } else if (key.startsWith(prefix)) {
          // Rename children
          const suffix = key.substring(prefix.length);
          const childNewId = newPrefix + suffix;
          const childOldSequence = state.nodes[key].context.sequence;
          
          // Replace the modified part of the sequence
          const childNewSequence = [...childOldSequence];
          childNewSequence[newSequence.length - 1] = newCall;
          
          newNodes[childNewId] = {
            ...state.nodes[key],
            id: childNewId,
            context: {
              ...state.nodes[key].context,
              sequence: childNewSequence
            }
          };
          delete newNodes[key];
        }
      });
      
      return { 
        nodes: newNodes,
        // Update selectedNodeId if it was the renamed node or a child
        selectedNodeId: state.selectedNodeId === id 
          ? newId 
          : state.selectedNodeId?.startsWith(prefix) 
            ? newPrefix + state.selectedNodeId.substring(prefix.length)
            : state.selectedNodeId
      };
    });
  },

  deleteNode: (id: string) => {
    set(state => {
      const newNodes = { ...state.nodes };
      // Delete node and all its descendants
      const prefix = id + " ";
      Object.keys(newNodes).forEach(key => {
        if (key === id || key.startsWith(prefix)) {
          delete newNodes[key];
        }
      });
      
      return { 
        nodes: newNodes,
        selectedNodeId: state.selectedNodeId === id || state.selectedNodeId?.startsWith(prefix) ? null : state.selectedNodeId
      };
    });
  },

  selectNode: (id: string | null) => set({ selectedNodeId: id }),
  
  toggleExpand: (id: string) => set(state => {
    if (!state.nodes[id]) return state;
    return {
      nodes: {
        ...state.nodes,
        [id]: { ...state.nodes[id], isExpanded: !state.nodes[id].isExpanded }
      }
    };
  }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  
  toggleBookmark: (id: string) => set(state => {
    if (!state.nodes[id]) return state;
    return {
      nodes: {
        ...state.nodes,
        [id]: { ...state.nodes[id], isBookmarked: !state.nodes[id].isBookmarked }
      }
    };
  }),
  
  toggleLeftPanel: () => set(state => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
  toggleRightPanel: () => set(state => ({ isRightPanelOpen: !state.isRightPanelOpen })),

  expandAll: () => set(state => {
    const newNodes = { ...state.nodes };
    Object.keys(newNodes).forEach(key => {
      newNodes[key] = { ...newNodes[key], isExpanded: true };
    });
    return { nodes: newNodes };
  }),

  collapseAll: () => set(state => {
    const newNodes = { ...state.nodes };
    Object.keys(newNodes).forEach(key => {
      newNodes[key] = { ...newNodes[key], isExpanded: false };
    });
    return { nodes: newNodes };
  }),

  expandToDepth: (depth: number) => set(state => {
    const newNodes = { ...state.nodes };
    Object.keys(newNodes).forEach(key => {
      const nodeDepth = newNodes[key].context.sequence.length;
      newNodes[key] = { ...newNodes[key], isExpanded: nodeDepth < depth };
    });
    return { nodes: newNodes };
  })
}));
