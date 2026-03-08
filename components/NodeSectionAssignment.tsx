import { useState } from 'react';
import { X } from 'lucide-react';
import { type SectionTreeNode, useBiddingStore } from '@/store/useBiddingStore';
import { getMutationIntentUiMeta } from '@/lib/domain/bidding/mutation-intents';

interface NodeSectionAssignmentProps {
  nodeId: string;
  compact?: boolean;
}

interface FlatSectionOption {
  id: string;
  depth: number;
  label: string;
  pathLabel: string;
}

type SectionRemoveDialogState =
  | { intent: 'remove-node-section'; sectionId: string; label: string }
  | { intent: 'remove-subtree-rule'; ruleId: string; label: string }
  | null;

function flattenSections(
  tree: SectionTreeNode[],
  getPathLabel: (sectionId: string) => string,
  depth = 0,
): FlatSectionOption[] {
  return tree.flatMap((item) => {
    const current: FlatSectionOption = {
      id: item.section.id,
      depth,
      label: item.section.name,
      pathLabel: getPathLabel(item.section.id),
    };
    return [current, ...flattenSections(item.children, getPathLabel, depth + 1)];
  });
}

export function NodeSectionAssignment({ nodeId, compact = false }: NodeSectionAssignmentProps) {
  const {
    sectionsById,
    nodeSectionIds,
    assignNodeToSection,
    unassignNodeFromSection,
    createSubtreeRule,
    deleteSubtreeRule,
    getSectionTree,
    getSectionPath,
    getEffectiveSectionIds,
    getSubtreeRulesForNode,
  } = useBiddingStore();

  const [error, setError] = useState('');
  const [selectedForSubtree, setSelectedForSubtree] = useState('');
  const [removeDialog, setRemoveDialog] = useState<SectionRemoveDialogState>(null);

  const sectionOptions = flattenSections(
    getSectionTree(),
    (sectionId) => getSectionPath(sectionId).map((item) => item.name).join(' / '),
  );

  const directSectionIds = nodeSectionIds[nodeId] ?? [];
  const directSet = new Set(directSectionIds);
  const effectiveSet = new Set(getEffectiveSectionIds(nodeId));
  const subtreeRules = getSubtreeRulesForNode(nodeId);
  const subtreeRuleSectionIds = new Set(subtreeRules.map((rule) => rule.sectionId));

  const handleToggleDirect = (sectionId: string, checked: boolean) => {
    if (!checked) {
      const label = sectionsById[sectionId]?.name ?? 'Section';
      setRemoveDialog({ intent: 'remove-node-section', sectionId, label });
      return;
    }

    const result = assignNodeToSection(nodeId, sectionId);
    if (!result.ok) {
      setError(result.error || 'Failed to update assignment.');
      return;
    }
    setError('');
  };

  const handleAddSubtreeRule = () => {
    if (!selectedForSubtree) {
      setError('Select a section for subtree assignment.');
      return;
    }
    const result = createSubtreeRule(selectedForSubtree, nodeId, true);
    if (!result.ok) {
      setError(result.error || 'Failed to create subtree rule.');
      return;
    }
    setError('');
    setSelectedForSubtree('');
  };

  const handleRemoveSubtreeRule = (ruleId: string) => {
    const rule = subtreeRules.find((item) => item.id === ruleId);
    const label = rule && sectionsById[rule.sectionId] ? sectionsById[rule.sectionId].name : 'Section';
    setRemoveDialog({ intent: 'remove-subtree-rule', ruleId, label });
  };

  const closeRemoveDialog = () => {
    setRemoveDialog(null);
  };

  const confirmRemoveDialog = () => {
    if (!removeDialog) return;

    if (removeDialog.intent === 'remove-node-section') {
      const result = unassignNodeFromSection(nodeId, removeDialog.sectionId);
      if (!result.ok) {
        setError(result.error || 'Failed to remove section link.');
        return;
      }
      setError('');
      setRemoveDialog(null);
      return;
    }

    const result = deleteSubtreeRule(removeDialog.ruleId);
    if (!result.ok) {
      setError(result.error || 'Failed to remove subtree rule.');
      return;
    }
    setError('');
    setRemoveDialog(null);
  };

  if (sectionOptions.length === 0) {
    return (
      <div className={`rounded-md border border-slate-200 bg-slate-50 ${compact ? 'p-2' : 'p-3'}`}>
        <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-500`}>
          No sections created yet. Create one in the left panel first.
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
          Apply To Node
        </div>
        <div className="max-h-36 overflow-y-auto pr-1 space-y-1">
          {sectionOptions.map((section) => {
            const isDirect = directSet.has(section.id);
            const isEffective = effectiveSet.has(section.id);
            return (
              <label
                key={section.id}
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100 text-slate-700"
                title={section.pathLabel}
              >
                <input
                  type="checkbox"
                  checked={isDirect}
                  onChange={(event) => handleToggleDirect(section.id, event.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate" style={{ paddingLeft: `${section.depth * 10}px` }}>
                  {section.label}
                </span>
                {!isDirect && isEffective && (
                  <span className="ml-auto shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-700">
                    via subtree
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
          Apply To Subtree
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={selectedForSubtree}
            onChange={(event) => setSelectedForSubtree(event.target.value)}
            className={`flex-1 rounded-md border border-slate-200 bg-white px-2 ${
              compact ? 'h-7 text-[10px]' : 'h-8 text-[11px]'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">Select section...</option>
            {sectionOptions.map((section) => (
              <option
                key={section.id}
                value={section.id}
                disabled={subtreeRuleSectionIds.has(section.id)}
              >
                {section.pathLabel}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddSubtreeRule}
            className={`rounded-md bg-blue-600 px-3 text-white hover:bg-blue-700 ${
              compact ? 'h-7 text-[10px]' : 'h-8 text-[11px]'
            }`}
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1">
          Active Subtree Rules
        </div>
        {subtreeRules.length === 0 ? (
          <div className="text-slate-400 italic">No subtree rules</div>
        ) : (
          <div className="space-y-1">
            {subtreeRules.map((rule) => {
              const section = sectionsById[rule.sectionId];
              if (!section) return null;
              return (
                <div
                  key={rule.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-700"
                  title={`${section.name} (future descendants included)`}
                >
                  <span className="truncate">{section.name}</span>
                  {rule.includeFutureDescendants && (
                    <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                      future on
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtreeRule(rule.id)}
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                    title="Remove subtree rule"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <div className="text-[10px] text-rose-600">{error}</div>}

      {removeDialog && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={closeRemoveDialog}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-semibold text-slate-900">
                {getMutationIntentUiMeta(removeDialog.intent).title}
              </div>
              <div className="mt-0.5 text-xs text-slate-700">
                {removeDialog.label}
              </div>
            </div>

            <div className="px-4 py-3 text-sm text-slate-600">
              {removeDialog.intent === 'remove-node-section'
                ? 'This will only remove node assignment from this section. The bidding tree remains unchanged.'
                : 'This will only remove subtree assignment rule. Nodes and sequences remain unchanged.'}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRemoveDialog}
                className="h-8 px-3 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveDialog}
                className={`h-8 px-3 rounded-md text-sm text-white ${
                  getMutationIntentUiMeta(removeDialog.intent).confirmButtonClassName
                }`}
              >
                {getMutationIntentUiMeta(removeDialog.intent).confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
