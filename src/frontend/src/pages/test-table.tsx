import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ProjectsAPI } from "@/lib/projects-api"
import type { ProjectShallowType } from "@/types"


export default function ResponsivePinnedTable() {
  // State management
  const [projects, setProjects] = React.useState<ProjectShallowType[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedProjects, setSelectedProjects] = React.useState<ProjectShallowType[]>([])
  
  // Optional: allow toggling pin for first data column
  const [pinFirst, setPinFirst] = React.useState(true)

  // CSS variables to keep sticky offsets in sync and ensure z-index works
  const stickyVars = {
    "--checkbox-col": "48px",
    "--first-col": "250px", // Wider for project names
    "--actions-col": "64px",
  } as React.CSSProperties

  const nameHeadSticky = pinFirst ? "sticky left-[var(--checkbox-col)] z-30 bg-muted" : ""
  const nameCellSticky = pinFirst ? "sticky left-[var(--checkbox-col)] z-20 bg-background" : ""

  // Load projects on mount
  React.useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true)
      setError(null)
      
      const result = await ProjectsAPI.fetchProjects()
      
      if (result.ok) {
        setProjects(result.value)
      } else {
        setError(result.error instanceof Error ? result.error.message : 'Failed to load projects')
      }
      
      setIsLoading(false)
    }

    loadProjects()
  }, [])

  // Filter projects based on search
  const filteredProjects = React.useMemo(() => {
    if (!searchQuery) return projects
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [projects, searchQuery])

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Handle row selection
  const handleSelectAll = (checked: boolean) => {
    setSelectedProjects(checked ? filteredProjects : [])
  }

  const handleSelectProject = (project: ProjectShallowType, checked: boolean) => {
    if (checked) {
      setSelectedProjects(prev => [...prev, project])
    } else {
      setSelectedProjects(prev => prev.filter(p => p.id !== project.id))
    }
  }

  const isProjectSelected = (project: ProjectShallowType) => {
    return selectedProjects.some(p => p.id === project.id)
  }

  const isAllSelected = selectedProjects.length === filteredProjects.length && filteredProjects.length > 0

  return (
    <Card className="w-full overflow-hidden rounded-2xl shadow">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-xl font-semibold">Project Management</CardTitle>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
          <Input 
            placeholder="Search projects..." 
            className="md:w-[250px]" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select>
            <SelectTrigger className="md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="has-documents">With Documents</SelectItem>
              <SelectItem value="no-documents">No Documents</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="pin-first" checked={pinFirst} onCheckedChange={setPinFirst} />
            <Label htmlFor="pin-first" className="cursor-pointer">Pin first data column</Label>
          </div>
          <Button className="md:ml-auto">
            <Plus className="mr-2 h-4 w-4" /> Add Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="w-full overflow-x-auto rounded-2xl"
          style={stickyVars}
        >
          <Table className="min-w-[1800px] relative">
            <TableHeader className="bg-muted sticky top-0 z-40">
              <TableRow>
                {/* Checkbox pinned - ensure position is sticky so z-index applies */}
                <TableHead
                  className="sticky left-0 z-40 bg-muted w-[var(--checkbox-col)] min-w-[var(--checkbox-col)]"
                >
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all" 
                  />
                </TableHead>

                {/* First data column (optional pin) */}
                <TableHead
                  className={`w-[var(--first-col)] min-w-[var(--first-col)] ${nameHeadSticky}`}
                >
                  Name
                </TableHead>

                {/* Scrollable data columns */}
                <TableHead>Description</TableHead>
                <TableHead>Contact Name</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Has Documents</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead>Project ID</TableHead>

                {/* Actions pinned */}
                <TableHead
                  className="sticky right-0 z-40 bg-muted w-[var(--actions-col)] min-w-[var(--actions-col)]"
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell 
                    colSpan={12} 
                    className="h-24 text-center"
                  >
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell 
                    colSpan={12} 
                    className="h-24 text-center text-red-600"
                  >
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={12} 
                    className="h-24 text-center"
                  >
                    {searchQuery ? 'No projects found matching your search.' : 'No projects found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    {/* Checkbox cell pinned */}
                    <TableCell
                      className="sticky left-0 z-30 bg-background w-[var(--checkbox-col)] min-w-[var(--checkbox-col)]"
                    >
                      <Checkbox 
                        checked={isProjectSelected(project)}
                        onCheckedChange={(checked) => handleSelectProject(project, checked as boolean)}
                        aria-label={`Select ${project.name}`} 
                      />
                    </TableCell>

                    {/* First data column cell (optional pin) */}
                    <TableCell
                      className={`font-medium w-[var(--first-col)] min-w-[var(--first-col)] ${nameCellSticky}`}
                    >
                      {project.name}
                    </TableCell>

                    {/* Scrollable cells */}
                    <TableCell className="max-w-[200px] truncate">
                      {project.description || '—'}
                    </TableCell>
                    <TableCell>{project.contact_name}</TableCell>
                    <TableCell>{project.contact_email}</TableCell>
                    <TableCell className="text-center">
                      v{project.version}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {project.document_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {project.has_documents ? (
                        <span className="inline-flex items-center justify-center w-2 h-2 bg-green-500 rounded-full"></span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-2 h-2 bg-gray-300 rounded-full"></span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(project.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {project.updated_at ? formatDate(project.updated_at) : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {project.id.split('-')[0]}...
                    </TableCell>

                    {/* Dropdown pinned */}
                    <TableCell
                      className="sticky right-0 z-30 bg-background w-[var(--actions-col)] min-w-[var(--actions-col)]"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open actions for ${project.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>View Documents</DropdownMenuItem>
                          <DropdownMenuItem>Edit Project</DropdownMenuItem>
                          <DropdownMenuItem>Copy ID</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
