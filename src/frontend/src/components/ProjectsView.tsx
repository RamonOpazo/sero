import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Project } from '@/types';

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');

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

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Projects</h2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-80"
            />
            <Button>+ New Project</Button>
          </div>
        </div>
      </div>
      
      {/* Projects Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map(project => (
            <Card key={project.id} className="p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold mb-2">{project.name}</h3>
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {project.documents?.length || 0} documents
                </span>
                <Link to={`/project/${project.id}`}>
                  <Button size="sm">
                    Open
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
        
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No projects found</p>
            <Button>Create your first project</Button>
          </div>
        )}
      </div>
    </div>
  );
}
