import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export interface TablePaginationProps {
  // Current pagination state
  pageIndex: number
  pageSize: number
  totalItems: number

  // Selected rows info (optional)
  selectedCount?: number
  showSelection?: boolean

  // Event handlers
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void

  // Options
  pageSizeOptions?: number[]
  showPagination?: boolean
}

export function TablePagination({
  pageIndex,
  pageSize,
  totalItems,
  selectedCount = 0,
  showSelection = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 40, 50],
  showPagination = true
}: TablePaginationProps) {
  if (!showPagination) return null

  const totalPages = Math.ceil(totalItems / pageSize)

  const canPreviousPage = pageIndex > 0
  const canNextPage = pageIndex < totalPages - 1

  return (
    <div className="flex items-center justify-between px-4">
      {/* Selection info - hidden on mobile */}
      {showSelection && (
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {selectedCount} of {totalItems} row(s) selected.
        </div>
      )}
      
      {/* Main pagination controls */}
      <div className="flex w-full items-center gap-8 lg:w-fit">
        {/* Page size selector - hidden on mobile */}
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Page info */}
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {totalPages}
        </div>
        
        {/* Navigation buttons */}
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(0)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
