export type SelectionStateNorm = 'committed' | 'staged_deletion' | 'staged_edition' | 'staged_creation' | 'draft';

export function getNormalizedState(raw: unknown): SelectionStateNorm {
  const s = (raw || '').toString();
  if (s === 'committed' || s === 'staged_deletion' || s === 'staged_edition' || s === 'staged_creation') return s as SelectionStateNorm;
  return 'draft';
}

export function getStatusLabel(state: SelectionStateNorm): { colorClass: string; title: string; label: string } {
  switch (state) {
    case 'committed':
      return { colorClass: 'bg-zinc-500', title: 'Committed', label: 'Committed' };
    case 'staged_deletion':
      return { colorClass: 'bg-red-500', title: 'Staged deletion', label: 'Deletion' };
    case 'staged_edition':
      return { colorClass: 'bg-amber-500', title: 'Staged edition', label: 'Edition' };
    case 'staged_creation':
      return { colorClass: 'bg-blue-500', title: 'Staged creation', label: 'Creation' };
    case 'draft':
    default:
      return { colorClass: 'bg-emerald-500', title: 'Unstaged (local)', label: 'Unstaged' };
  }
}

export function getBoxColorClasses(state: SelectionStateNorm): { border: string; text: string; borderStyle: 'dashed'|'solid'|'double' } {
  switch (state) {
    case 'committed':
      return { border: 'border-zinc-500/80 hover:border-zinc-600/95', text: 'text-zinc-600', borderStyle: 'double' };
    case 'staged_deletion':
      return { border: 'border-red-500/80 hover:border-red-600/95', text: 'text-red-600', borderStyle: 'solid' };
    case 'staged_edition':
      return { border: 'border-amber-500/80 hover:border-amber-600/95', text: 'text-amber-600', borderStyle: 'solid' };
    case 'staged_creation':
      return { border: 'border-blue-500/80 hover:border-blue-600/95', text: 'text-blue-600', borderStyle: 'solid' };
    case 'draft':
    default:
      return { border: 'border-emerald-500/80 hover:border-emerald-600/95', text: 'text-emerald-600', borderStyle: 'dashed' };
  }
}
