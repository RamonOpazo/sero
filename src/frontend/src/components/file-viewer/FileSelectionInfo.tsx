import { Button } from '@/components/ui/button'

interface Selection {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

interface FileSelectionInfoProps {
  selections: Selection[]
  onClearSelections: () => void
}

export function FileSelectionInfo({ selections, onClearSelections }: FileSelectionInfoProps) {
  if (selections.length === 0) {
    return null
  }

  return (
    <div className="flex-shrink-0 p-6 border-b">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Selections</h3>
        <Button variant="outline" size="sm" onClick={onClearSelections}>
          Clear All
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {selections.length} selection{selections.length !== 1 ? 's' : ''} made
      </p>
    </div>
  )
}
