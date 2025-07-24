"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, FileText, CheckCircle, Clock, XCircle, MoreHorizontal, Copy, Eye, Download, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

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

// Helper function to format file size from bytes to human readable format
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

type ViewFileCallback = (document: Document, fileType: 'original' | 'obfuscated') => void
type DeleteDocumentCallback = (document: Document) => void
type EditDocumentCallback = (document: Document) => void

export const createDocumentsColumns = (
  onViewFile: ViewFileCallback,
  onDeleteDocument?: DeleteDocumentCallback,
  onEditDocument?: EditDocumentCallback
): ColumnDef<Document>[] => [
  {
    accessorFn: (row) => row.original_file?.filename || row.description || 'Untitled Document',
    id: "filename",
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
    accessorFn: (row) => {
      const getStatusPriority = (status: DocumentStatus) => {
        switch (status) {
          case 'pending': return 0;
          case 'processed': return 1;
          case 'failed': return 2;
          default: return 3;
        }
      };
      return getStatusPriority(getDocumentStatus(row));
    },
    id: "status",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
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
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const document = row.original
      const description = document.description
      
      return (
        <div className="max-w-xs truncate text-muted-foreground">
          {description || "No description"}
        </div>
      )
    },
  },
  {
    accessorFn: (row) => row.original_file?.selections?.length || 0,
    id: "selections",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0"
          >
            Selections
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
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
    accessorFn: (row) => row.original_file?.prompts?.length || 0,
    id: "prompts",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0"
          >
            Prompts
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
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
    accessorFn: (row) => row.original_file?.size || 0,
    id: "size",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const document = row.original
      const fileSize = document.original_file ? formatFileSize(document.original_file.size) : '-'
      
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
                    navigator.clipboard.writeText(document.id).then(() => {
                      toast.success('Document ID copied to clipboard', {
                        description: `ID: ${document.id}`
                      });
                    }).catch((error) => {
                      console.error('Failed to copy to clipboard:', error);
                      toast.error('Failed to copy to clipboard', {
                        description: 'Please try again or copy manually.'
                      });
                    })
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy document ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    onViewFile(document, 'original')
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
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
                  <Eye className="h-4 w-4 mr-2" />
                  View obfuscated file
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Download original file
                </DropdownMenuItem>
                <DropdownMenuItem 
                  disabled={!document.obfuscated_file}
                  className={!document.obfuscated_file ? "text-muted-foreground" : ""}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download obfuscated file
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    if (onEditDocument) {
                      onEditDocument(document)
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit document
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => {
                    e.preventDefault()
                    if (onDeleteDocument) {
                      onDeleteDocument(document)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
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
