import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectsDataTable } from './projects-data-table';
import { CreateProjectDialog, EditProjectDialog } from './dialogs';
import { ProjectAiSettingsDialog } from './dialogs/project-ai-settings-dialog';
import { useProjectsView } from './use-projects-view';
import { TypedConfirmationDialog } from '@/components/shared/typed-confirmation-dialog';
import { FormConfirmationDialog } from '@/components/shared';
import { useAiProcessing } from '@/providers/ai-processing-provider';
import { useProjectTrust } from '@/providers/project-trust-provider';
import { startProjectRun } from '@/lib/ai-runner';
import { toast } from 'sonner';
import { startProjectRedaction } from '@/lib/ai-runner';

import type { ProjectShallowType } from '@/types';

export function ProjectsView() {
  const navigate = useNavigate();

  // Custom navigation handler for the data table
  const handleSelectProject = (project: ProjectShallowType) => {
    navigate(`/projects/${project.id}/documents`);
  };

  // Lift all business logic here
  const {
    projects,
    selectedProjects,
    isLoading,
    error,
    dialogState,
    actionHandlers,
  } = useProjectsView(handleSelectProject);

  // Local state for AI run/redaction dialogs
  const aiProc = useAiProcessing();
  const { ensureProjectTrust } = useProjectTrust();
  const [runProjectDetection, setRunProjectDetection] = useState<{ isOpen: boolean; project: ProjectShallowType | null }>({ isOpen: false, project: null });
  const [runProjectRedaction, setRunProjectRedaction] = useState<{ isOpen: boolean; project: ProjectShallowType | null }>({ isOpen: false, project: null });

  const tableHandlers = {
    ...actionHandlers,
    onRunAiDetection: (project: ProjectShallowType) => setRunProjectDetection({ isOpen: true, project }),
    onRunRedaction: (project: ProjectShallowType) => setRunProjectRedaction({ isOpen: true, project }),
  } as const;

  return (
    <>
      <ProjectsDataTable
        projects={projects}
        selectedProjects={selectedProjects}
        isLoading={isLoading}
        error={error}
        actionHandlers={tableHandlers as any}
      />

      {/* Moved: Project Creation Dialog */}
      <CreateProjectDialog
        isOpen={dialogState.create.isOpen}
        onClose={dialogState.create.onClose}
        onSubmit={dialogState.create.onSubmit}
      />

      <EditProjectDialog
        isOpen={dialogState.edit.isOpen}
        onClose={dialogState.edit.onClose}
        onSubmit={dialogState.edit.onSubmit}
        project={dialogState.edit.project}
      />

      <ProjectAiSettingsDialog
        isOpen={dialogState.ai.isOpen}
        onClose={dialogState.ai.onClose}
        onSubmit={dialogState.ai.onSubmit}
        initial={undefined}
      />

      <TypedConfirmationDialog
        isOpen={dialogState.delete.isOpen}
        onClose={dialogState.delete.onClose}
        onConfirm={dialogState.delete.onConfirm}
        title="Delete Project"
        description={`Are you sure you want to delete the project "${dialogState.delete.selectedProject?.name}"?`}
        confirmationText="delete"
        confirmButtonText="Delete Project"
        variant="destructive"
        messages={[
          { variant: 'warning', title: 'Irreversible', description: 'This action cannot be undone.' },
          { variant: 'error', title: 'Data loss', description: 'All associated documents and files will be permanently deleted.' },
        ]}
      />

      <TypedConfirmationDialog
        isOpen={dialogState.bulkDelete.isOpen}
        onClose={dialogState.bulkDelete.onClose}
        onConfirm={dialogState.bulkDelete.onConfirm}
        title={`Delete ${selectedProjects.length} Project${selectedProjects.length === 1 ? '' : 's'}`}
        description={`Are you sure you want to delete ${selectedProjects.length} selected project${selectedProjects.length === 1 ? '' : 's'}?`}
        confirmationText="delete"
        confirmButtonText={`Delete ${selectedProjects.length} Project${selectedProjects.length === 1 ? '' : 's'}`}
        variant="destructive"
        messages={[
          { variant: 'warning', title: 'Irreversible', description: 'This action cannot be undone.' },
          { variant: 'error', title: 'Data loss', description: 'All associated documents and files will be permanently deleted.' },
        ]}
      />

      {/* Run Project AI Detection Dialog */}
      <FormConfirmationDialog
        isOpen={runProjectDetection.isOpen}
        onClose={() => setRunProjectDetection({ isOpen: false, project: null })}
        title="Run Project AI Detection"
        description="Run AI detection across all documents in this project to stage new selections based on current AI settings."
        confirmButtonText="Run"
        cancelButtonText="Cancel"
        variant="default"
        messages={([
          { variant: 'warning', title: 'Batch operation', description: 'This will iterate over every document and may take a while depending on size and model.', },
        ] as any)}
        onSubmit={async () => {
          const project = runProjectDetection.project;
          if (!project) return;
          try {
            const { keyId, encryptedPassword } = await ensureProjectTrust(project.id);
            startProjectRun(aiProc as any, project.id, { keyId, encryptedPassword });
            toast.success('Project AI run started', { description: project.name });
          } catch (e) {
            toast.info('Project AI run cancelled');
          } finally {
            setRunProjectDetection({ isOpen: false, project: null });
          }
        }}
      />

      {/* Run Project Redaction Dialog */}
      <FormConfirmationDialog
        isOpen={runProjectRedaction.isOpen}
        onClose={() => setRunProjectRedaction({ isOpen: false, project: null })}
        title="Run Project Redaction"
        description="Generate redacted PDFs for every document in this project using committed selections."
        confirmButtonText="Run"
        cancelButtonText="Cancel"
        variant="destructive"
        messages={([
          { variant: 'warning', title: 'Batch operation', description: 'This will start processing for all project documents. Existing redacted files will be replaced.', },
        ] as any)}
        initialValues={{ scope: (typeof window !== 'undefined' && (window.localStorage.getItem('sero.redaction.scope') as any)) || 'pan' }}
        fields={[
          { type: 'select', name: 'scope', label: 'Scope', tooltip: 'Redact using selections of this scope', options: [
            { value: 'project', label: 'Project' },
            { value: 'document', label: 'Document' },
            { value: 'pan', label: 'Pan (both)' },
          ] },
        ]}
        onSubmit={async (values) => {
          const project = runProjectRedaction.project;
          if (!project) return;
          try {
            const { keyId, encryptedPassword } = await ensureProjectTrust(project.id);
            const scope = String(values.scope || 'pan') as 'project' | 'document' | 'pan';
            try { if (typeof window !== 'undefined') window.localStorage.setItem('sero.redaction.scope', scope); } catch {}
            startProjectRedaction(aiProc as any, project.id, { keyId, encryptedPassword, scope, getFreshCreds: async () => ensureProjectTrust(project.id) });
          } catch (e: any) {
            if (e instanceof Error && e.message === 'cancelled') {
              toast.message('Project unlock cancelled');
            } else {
              toast.error('Failed to start project redaction', { description: (e?.message || 'Please try again.') as any });
              try { console.error('startProjectRedaction failed:', e); } catch {}
            }
          } finally {
            setRunProjectRedaction({ isOpen: false, project: null });
          }
        }}
      />
    </>
  );
}
