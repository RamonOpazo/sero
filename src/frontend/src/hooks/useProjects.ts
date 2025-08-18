import { useState, useCallback } from "react";
import { toast } from 'sonner'
import type { ApiResponse, ProjectShallowType, ProjectCreateType, ProjectUpdateType } from '@/types'
import { AsyncResultWrapper, type Result } from '@/lib/result'
import { api } from "@/lib/axios"

export function useProjects() {
  const [projects, setProjects] = useState<ProjectShallowType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const refreshProjects = useCallback(async (skip = 0, limit = 100): Promise<Result<ProjectShallowType[], unknown>> => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    const queryString = params.toString();
    const url = `/projects/shallow${queryString ? `?${queryString}` : ''}`;

    return await AsyncResultWrapper
      .from(api.safe.get(url) as Promise<Result<ProjectShallowType[], unknown>>)
      .tap((projectList) => setProjects(projectList))
      .catch((error: unknown) => {
        setError(error);
        toast.error(
          "Failed to fetch projects",
          { description: "Please refresh the page to try again." }
        );
      })
      .finally(() => setLoading(false))
      .toResult();
  }, []);

  const createProject = useCallback(async (projectData: ProjectCreateType): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .from(api.safe.post(`/projects`, projectData) as Promise<Result<ProjectShallowType, unknown>>)
      .andThen(() => refreshProjects()) // Refresh the list after creating
      .tap(() => {
        toast.success(
          "Project created successfully",
          { description: `Created "${projectData.name}"` }
        )
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to create project",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
      })
      .void()
      .toResult();
  }, [refreshProjects]);

  const updateProject = useCallback(async (projectId: string, projectData: ProjectUpdateType): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .from(api.safe.put(`/projects/id/${projectId}`, {
        name: projectData.name?.trim(),
        description: projectData.description?.trim(),
        contact_name: projectData.contact_name?.trim(),
        contact_email: projectData.contact_email?.trim(),
        version: projectData.version,
      }) as Promise<Result<ApiResponse, unknown>>)
      .andThen(() => refreshProjects())
      .tap(() => {
        toast.success(
          "Project updated successfully",
          { description: `Updated "${projectData.name || 'project'}"` }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to update project",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
      })
      .void()
      .toResult();
  }, [refreshProjects]);

  const deleteProjects = useCallback(async (projectsToDelete: ProjectShallowType[]): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .all(projectsToDelete.map(
        (p) => AsyncResultWrapper.from(api.safe.delete(`/projects/id/${p.id}`) as Promise<Result<ApiResponse, unknown>>)
      ))
      .andThen(() => refreshProjects())
      .tap(() => {
        const projectCount = projectsToDelete.length;
        const projectNames = projectsToDelete.map(p => p.name).join(', ');
        toast.success(
          `Successfully deleted ${projectCount} project${projectCount !== 1 ? "s" : ""}`,
          { 
            description: projectCount === 1 
              ? `Deleted "${projectNames}"` 
              : `Deleted ${projectCount} projects` 
          }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to delete projects",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
      })
      .void()
      .toResult();
  }, [refreshProjects]);

  return {
    projects,
    loading,
    error,
    refreshProjects,
    createProject,
    updateProject,
    deleteProjects
  };
}
