"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, FileText, CheckCircle, Clock, XCircle, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Document, DocumentStatus } from "@/types"

const statusConfig = {
  pending: { icon: Clock, className: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Pending' },
  processed: { icon: CheckCircle, className: 'bg-green-50 text-green-700 border-green-200', label: 'Processed' },
  failed: { icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200', label: 'Failed' }
}

const getDocumentStatus = (doc: Document): DocumentStatus => {
  if (!doc.original_file) return 'failed'
  return doc.status
}

const hasOriginalFile = (doc: Document) => !!doc.original_file

type ViewFileCallback = (document: Document, fileType: 'original' | 'obfuscated') => void

export const createDocumentsColumns = (onViewFile: ViewFileCallback): ColumnDef<Document>[] => [
  {
    accessorKey: "filename",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const document = row.original
      const filename = document.original_file?.filename || document.description || 'Untitled Document'
      
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate max-w-sm">{filename}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: () => <div className="text-center">Status</div>,
    cell: ({ row }) => {
      const document = row.original
      const status = getDocumentStatus(document)
      const StatusIcon = statusConfig[status].icon
      
      return (
        <div className="text-center">
          <Badge variant="outline" className={statusConfig[status].className}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig[status].label}
          </Badge>
        </div>
      )
    },
  },
  {
    id: "selections",
    header: () => <div className="text-center">Selections</div>,
    cell: ({ row }) => {
      const document = row.original
      const selectionsCount = document.original_file?.selections?.length || 0
      
      return (
        <div className="text-center">
          <Badge variant="secondary">{selectionsCount}</Badge>
        </div>
      )
    },
  },
  {
    id: "prompts",
    header: () => <div className="text-center">Prompts</div>,
    cell: ({ row }) => {
      const document = row.original
      const promptsCount = document.original_file?.prompts?.length || 0
      
      return (
        <div className="text-center">
          <Badge variant="secondary">{promptsCount}</Badge>
        </div>
      )
    },
  },
  {
    id: "size",
    header: "Size",
    cell: ({ row }) => {
      const document = row.original
      const fileSize = document.original_file ? '2.3MB' : '-' // TODO: get actual file size from document.original_file.size
      
      return (
        <div className="text-muted-foreground text-sm">{fileSize}</div>
      )
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    enableHiding: false,
    cell: ({ row }) => {
      const document = row.original

      return (
        <div className="text-center">
          {hasOriginalFile(document) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    navigator.clipboard.writeText(document.id).catch(console.error)
                  }}
                >
                  Copy document ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    onViewFile(document, 'original')
                  }}
                >
                  View original file
                </DropdownMenuItem>
                <DropdownMenuItem 
                  disabled={!document.obfuscated_file}
                  className={!document.obfuscated_file ? "text-muted-foreground" : ""}
                  onClick={(e) => {
                    e.preventDefault()
                    if (document.obfuscated_file) {
                      onViewFile(document, 'obfuscated')
                    }
                  }}
                >
                  View obfuscated file
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Download original file
                </DropdownMenuItem>
                <DropdownMenuItem 
                  disabled={!document.obfuscated_file}
                  className={!document.obfuscated_file ? "text-muted-foreground" : ""}
                >
                  Download obfuscated file
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Edit document
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Delete document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" variant="outline" disabled className="text-xs px-2">
              No File
            </Button>
          )}
        </div>
      )
    },
  },
]
