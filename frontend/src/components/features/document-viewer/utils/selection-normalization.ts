export type NormalizedSelectionState = 'committed' | 'staged_deletion' | 'staged_edition' | 'staged_creation' | 'draft';

export function getNormalizedSelectionState(raw: unknown): NormalizedSelectionState {
  const s = (raw || '').toString();
  if (s === 'committed' || s === 'staged_deletion' || s === 'staged_edition' || s === 'staged_creation') return s as NormalizedSelectionState;
  return 'draft';
}
