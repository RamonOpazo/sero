import { toast } from 'sonner';
import type { ApiResponse, ProjectType, ProjectShallowType, ProjectCreateType, ProjectUpdateType, ProjectSummaryType, ProjectAiSettingsType, ProjectAiSettingsUpdateType } from '@/types';
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
   * Fetch shallow projects (without nested documents) with optional pagination
   */
  async fetchProjectsShallow(skip = 0, limit = 100): Promise<Result<ProjectShallowType[], unknown>> {
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
   * Convenience alias to previous function name
   */
  async fetchProjects(skip = 0, limit = 100) {
    return this.fetchProjectsShallow(skip, limit);
  },

  /**
   * Fetch full projects (includes nested documents)
   */
  async fetchProjectsFull(skip = 0, limit = 100): Promise<Result<ProjectType[], unknown>> {
    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    const queryString = params.toString();
    const url = `/projects${queryString ? `?${queryString}` : ''}`;

    return await AsyncResultWrapper
      .from(api.safe.get(url) as Promise<Result<ProjectType[], unknown>>)
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
   * Get a single project by ID (full)
   */
  async getProject(projectId: string): Promise<Result<ProjectType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get(`/projects/id/${projectId}`) as Promise<Result<ProjectType, unknown>>)
      .catch((error: unknown) => {
        toast.error(
          "Failed to load project",
          { description: "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Search projects by name (full)
   */
  async searchProjects(name: string, skip = 0, limit = 100): Promise<Result<ProjectType[], unknown>> {
    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    if (name) params.append('name', name);
    const url = `/projects/search?${params.toString()}`;
    return AsyncResultWrapper
      .from(api.safe.get(url) as Promise<Result<ProjectType[], unknown>>)
      .catch((error: unknown) => {
        toast.error(
          "Failed to search projects",
          { description: "Please refine your search and try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Get AI settings for a project
   */
  async getProjectAiSettings(projectId: string): Promise<Result<ProjectAiSettingsType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get(`/projects/id/${projectId}/ai-settings`) as Promise<Result<ProjectAiSettingsType, unknown>>)
      .catch((error: unknown) => {
        toast.error("Failed to load AI settings", { description: "Please try again." });
        throw error;
      })
      .toResult();
  },

  /**
   * Update AI settings for a project
   */
  async updateProjectAiSettings(projectId: string, data: ProjectAiSettingsUpdateType): Promise<Result<ProjectAiSettingsType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.put(`/projects/id/${projectId}/ai-settings`, data) as Promise<Result<ProjectAiSettingsType, unknown>>)
      .catch((error: unknown) => {
        toast.error("Failed to update AI settings", { description: "Please try again." });
        throw error;
      })
      .toResult();
  },

  /**
   * Get project summary
   */
  async getProjectSummary(projectId: string): Promise<Result<ProjectSummaryType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get(`/projects/id/${projectId}/summary`) as Promise<Result<ProjectSummaryType, unknown>>)
      .catch((error: unknown) => {
        toast.error(
          "Failed to load project summary",
          { description: "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Create a new project (plaintext password - legacy)
   */
  async createProject(projectData: ProjectCreateType): Promise<Result<ProjectType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.post(`/projects`, projectData) as Promise<Result<ProjectType, unknown>>)
      .tap(() => {
        toast.success(
          "Project created successfully",
          { description: `Created \"${projectData.name}\"` }
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
   * Create a new project with encrypted password in transit
   */
  async createProjectEncrypted(
    projectData: Omit<ProjectCreateType, 'password'>,
    creds: { keyId: string; encryptedPassword: string },
  ): Promise<Result<ProjectType, unknown>> {
    const payload = {
      name: projectData.name?.trim(),
      description: (projectData.description?.trim?.() || projectData.description) ?? undefined,
      contact_name: projectData.contact_name?.trim(),
      contact_email: projectData.contact_email?.trim(),
      key_id: creds.keyId,
      encrypted_password: creds.encryptedPassword,
    };
    return AsyncResultWrapper
      .from(api.safe.post(`/projects`, payload) as Promise<Result<ProjectType, unknown>>)
      .tap(() => {
        toast.success(
          "Project created successfully",
          { description: `Created \"${projectData.name}\"` }
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
  async updateProject(projectId: string, projectData: ProjectUpdateType): Promise<Result<ProjectType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.put(`/projects/id/${projectId}`, {
        name: projectData.name?.trim(),
        description: projectData.description?.trim(),
        contact_name: projectData.contact_name?.trim(),
        contact_email: projectData.contact_email?.trim(),
      }) as Promise<Result<ProjectType, unknown>>)
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
