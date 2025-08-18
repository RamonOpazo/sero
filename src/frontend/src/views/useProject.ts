import { useState, useEffect, useCallback } from "react";
import { toast } from 'sonner'
import type { ApiResponse, ProjectType, ProjectCreateType, ProjectUpdateType } from '@/types'
import { AsyncResultWrapper, type Result } from '@/lib/result'
import { api } from "@/lib/axios"

export function useProjects() {
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const refreshProjects = useCallback(async (): Promise<Result<ProjectType[], unknown>> => {
    setLoading(true);
    setError(null);

    return await AsyncResultWrapper
      .from(api.safe.get(`/projects`) as Promise<Result<ProjectType[], unknown>>)
      .tap((project) => setProjects(project))
      .catch((_: unknown) => {
        toast.error(
          "Failed to fetch projects:",
          { description: "Please refresh the page to try again." });
      })
      .finally(() => setLoading(false))
      .toResult();
    ;
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const createProject = useCallback(async (projectData: ProjectCreateType): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .from(api.safe.post(`/projects`, projectData) as Promise<Result<ProjectType, unknown>>)
      .andThen(refreshProjects)
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

  const deleteSelectedProjects = useCallback(async (projectsToDelete: ProjectType[]): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
    .all(projectsToDelete.map(
      (p) => AsyncResultWrapper.from(api.safe.delete(`/projects/id/${p.id}`) as Promise<Result<ApiResponse, unknown>>)))
      .andThen(refreshProjects)
      .tap(() => {
        const projectCount = projectsToDelete.length
        const projectNames = projectsToDelete.map(p => p.name).join(', ')
        toast.success(
          `Successfully deleted ${projectCount} project${projectCount !== 1 ? "s" : ""}`,
          { description: projectCount === 1 ? `Deleted "${projectNames}"` : `Deleted ${projectCount} projects`, }
        );
      })
      .catch((error) => {
        toast.error(
          "Failed to delete projects",
          { description: error instanceof Error ? error.message : "Please try again.", }
        );
      })
      .void()
      .toResult();
  }, [refreshProjects])

  const editSelectedProject = useCallback(async (projectToEdit: ProjectType, projectData: ProjectUpdateType): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .from(api.safe.put(`/projects/id/${projectToEdit.id}`, {
        name: projectData.name?.trim(),
        description: projectData.description?.trim(),
        contact_name: projectData.contact_name?.trim(),
        contact_email: projectData.contact_email?.trim(),
      }) as Promise<Result<ApiResponse, unknown>>)
      .andThen(refreshProjects)
      .tap(() => {
        toast.success(
          "Project updated successfully",
          { description: `Updated "${projectData.name}"` }, );
      })
      .catch((error) => {
        toast.error(
          "Failed to update project",
          { description: error instanceof Error ? error.message : "Please try again.", });
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
    deleteSelectedProjects,
    editSelectedProject
  };
}
