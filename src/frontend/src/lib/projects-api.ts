import { toast } from 'sonner';
import type { ApiResponse, ProjectShallowType, ProjectCreateType, ProjectUpdateType } from '@/types';
import { AsyncResultWrapper, type Result } from '@/lib/result';
import { api } from '@/lib/axios';

/**
 * Projects API utility - centralized project CRUD operations
 * 
 * This module provides a clean API layer for project operations that can be used by:
 * - useProjects hook (for state management)
 * - useProjectsView hook (for direct operations)
 * - Any other components that need project API access
 */

export const ProjectsAPI = {
  /**
   * Fetch projects with optional pagination
   */
  async fetchProjects(skip = 0, limit = 100): Promise<Result<ProjectShallowType[], unknown>> {
    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    const queryString = params.toString();
    const url = `/projects/shallow${queryString ? `?${queryString}` : ''}`;

    return await AsyncResultWrapper
      .from(api.safe.get(url) as Promise<Result<ProjectShallowType[], unknown>>)
      .catch((error: unknown) => {
        toast.error(
          "Failed to fetch projects",
          { description: "Please refresh the page to try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Create a new project
   */
  async createProject(projectData: ProjectCreateType): Promise<Result<ProjectShallowType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.post(`/projects`, projectData) as Promise<Result<ProjectShallowType, unknown>>)
      .tap(() => {
        toast.success(
          "Project created successfully",
          { description: `Created "${projectData.name}"` }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to create project",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, projectData: ProjectUpdateType): Promise<Result<ApiResponse, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.put(`/projects/id/${projectId}`, {
        name: projectData.name?.trim(),
        description: projectData.description?.trim(),
        contact_name: projectData.contact_name?.trim(),
        contact_email: projectData.contact_email?.trim(),
      }) as Promise<Result<ApiResponse, unknown>>)
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
        throw error;
      })
      .toResult();
  },

  /**
   * Delete multiple projects
   */
  async deleteProjects(projectsToDelete: ProjectShallowType[]): Promise<Result<ApiResponse[], unknown>> {
    return AsyncResultWrapper
      .all(projectsToDelete.map(
        (p) => AsyncResultWrapper.from(api.safe.delete(`/projects/id/${p.id}`) as Promise<Result<ApiResponse, unknown>>)
      ))
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
        throw error;
      })
      .toResult();
  },

  /**
   * Delete a single project
   */
  async deleteProject(project: ProjectShallowType): Promise<Result<ApiResponse, unknown>> {
    const result = await this.deleteProjects([project]);
    
    if (result.ok) {
      return { ok: true, value: result.value[0] };
    } else {
      return { ok: false, error: result.error };
    }
  }
};
