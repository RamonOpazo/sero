"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Download, Edit, Trash2, Copy, Eye } from "lucide-react"
import { Link } from "react-router-dom"
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
import type { Project } from "@/types"

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return 'Unknown'
  }
}

interface ProjectColumnsProps {
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onDeleteProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
}

export const createProjectColumns = ({ onDeleteProject, onEditProject }: ProjectColumnsProps): ColumnDef<Project>[] => [
  {
    accessorKey: "name",
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
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      return (
        <div className="max-w-md truncate text-muted-foreground">
          {description || "No description"}
        </div>
      )
    },
  },
  {
    accessorKey: "document_count",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0"
          >
            Documents
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const count = row.getValue("document_count") as number
      return (
        <div className="text-center">
          <Badge variant="secondary">{count || 0}</Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "obfuscated_count",
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0"
          >
            Obfuscated
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const count = row.getValue("obfuscated_count") as number
      return (
        <div className="text-center">
          <Badge variant="secondary">{count || 0}</Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as 'awaiting' | 'in_progress' | 'completed';
      
      let displayStatus: string;
      let badgeClass: string;
      
      switch (status) {
        case 'awaiting':
          displayStatus = "Awaiting";
          badgeClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
          break;
        case 'completed':
          displayStatus = "Complete";
          badgeClass = "bg-green-50 text-green-700 border-green-200";
          break;
        case 'in_progress':
          displayStatus = "In Progress";
          badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
          break;
        default:
          displayStatus = "Unknown";
          badgeClass = "bg-gray-50 text-gray-700 border-gray-200";
      }
      
      return (
        <Badge variant="outline" className={badgeClass}>
          {displayStatus}
        </Badge>
      );
    },
    sortingFn: (rowA, rowB) => {
      const getStatusPriority = (status: 'awaiting' | 'in_progress' | 'completed') => {
        switch (status) {
          case 'awaiting': return 0;
          case 'in_progress': return 1;
          case 'completed': return 2;
          default: return 3;
        }
      };
      
      const statusA = rowA.getValue("status") as 'awaiting' | 'in_progress' | 'completed';
      const statusB = rowB.getValue("status") as 'awaiting' | 'in_progress' | 'completed';
      
      return getStatusPriority(statusA) - getStatusPriority(statusB);
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string
      return (
        <div className="text-muted-foreground text-sm">
          {formatDate(createdAt)}
        </div>
      )
    },
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const updatedAt = row.getValue("updated_at") as string
      const createdAt = row.original.created_at
      return (
        <div className="text-muted-foreground text-sm">
          {formatDate(updatedAt || createdAt)}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    enableHiding: false,
    cell: ({ row }) => {
      const project = row.original

      const handleDownloadObfuscatedFiles = async () => {
        // Check if there are any obfuscated files to download
        const obfuscatedCount = project.obfuscated_count || 0;
        
        if (obfuscatedCount === 0) {
          toast.error('No obfuscated files available', {
            description: 'This project has no obfuscated files to download.'
          });
          return;
        }
        
        // Show loading toast
        const loadingToast = toast.loading('Preparing download...', {
          description: `Collecting ${obfuscatedCount} obfuscated file${obfuscatedCount !== 1 ? 's' : ''}`
        });
        
        try {
          const response = await fetch(`/api/projects/id/${project.id}/files/obfuscated/download`);
          
          if (response.ok) {
            // Create a blob from the response
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name}_obfuscated_files.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Success toast
            toast.success('Download started successfully', {
              id: loadingToast,
              description: `Downloaded ${obfuscatedCount} obfuscated file${obfuscatedCount !== 1 ? 's' : ''} from "${project.name}"`
            });
          } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Server error (${response.status}): ${errorText}`);
          }
        } catch (error) {
          console.error('Error downloading obfuscated files:', error);
          toast.error('Download failed', {
            id: loadingToast,
            description: error instanceof Error ? error.message : 'Failed to download obfuscated files. Please try again.'
          });
        }
      };

      const handleEditProject = () => {
        onEditProject(project);
      };

      const handleDeleteProject = () => {
        onDeleteProject(project);
      };

      return (
        <div className="text-center">
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
                  navigator.clipboard.writeText(project.id).then(() => {
                    toast.success('Project ID copied to clipboard', {
                      description: `ID: ${project.id}`
                    });
                  }).catch((error) => {
                    console.error('Failed to copy to clipboard:', error);
                    toast.error('Failed to copy to clipboard', {
                      description: 'Please try again or copy manually.'
                    });
                  })
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy project ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/project/${project.id}`} className="flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  View Documents
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadObfuscatedFiles}>
                <Download className="mr-2 h-4 w-4" />
                Download obfuscated files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEditProject}>
                <Edit className="mr-2 h-4 w-4" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleDeleteProject}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
