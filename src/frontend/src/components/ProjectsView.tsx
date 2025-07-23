import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { projectColumns } from '@/components/columns/projects-columns';
import { EmptyState } from '@/components/EmptyState';
import type { Project } from '@/types';

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Fetch projects from backend
    fetch('/api/projects')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Projects loaded:', data.length, 'projects');
        setProjects(data);
      })
      .catch(err => {
        console.error('Error fetching projects:', err);
      });
  }, []);

  const handleSelectionChange = useCallback((selectedRows: Project[]) => {
    setSelectedProjects(selectedRows);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Projects Title Section */}
      <div className="flex-shrink-0 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projects</h1>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedProjects.length > 0 && (
        <div className="flex-shrink-0 px-6 py-3 bg-muted/20 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected
            </span>
            <Button variant="destructive" size="sm">
              Delete Selected
            </Button>
          </div>
        </div>
      )}
      
      {/* Projects Data Table */}
      <div className="flex-1 overflow-hidden px-6">
        {projects.length > 0 ? (
          <DataTable
            columns={projectColumns}
            data={projects}
            searchKey="name"
            searchPlaceholder="Search projects..."
            onRowSelectionChange={handleSelectionChange}
            pageSize={10}
          />
        ) : (
          <EmptyState
            message="No projects found"
            buttonText="Create your first project"
            buttonIcon={<Plus className="h-4 w-4" />}
            onButtonClick={() => console.log('Create project clicked')}
          />
        )}
      </div>
    </div>
  );
}
