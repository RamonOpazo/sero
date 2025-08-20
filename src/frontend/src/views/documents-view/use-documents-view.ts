import { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWorkspace } from '@/providers/workspace-provider';
import { DocumentsAPI } from '@/lib/documents-api';
import type { DocumentShallowType, DocumentUpdateType, DocumentBulkUploadRequestType } from '@/types';

/**
 * Business logic hook for DocumentsView component
 * Handles document management, navigation, CRUD operations, and state management for a specific project
 */
export function useDocumentsView(onDocumentSelect?: (document: DocumentShallowType) => void) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { state, selectDocument } = useWorkspace();
  
  // Own document state management
  const [documents, setDocuments] = useState<DocumentShallowType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state management
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDocumentForEdit, setSelectedDocumentForEdit] = useState<DocumentShallowType | null>(null);
  const [selectedDocumentForDelete, setSelectedDocumentForDelete] = useState<DocumentShallowType | null>(null);

  // Load documents for the current project
  const refreshDocuments = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    const result = await DocumentsAPI.fetchDocumentsForProject(projectId);
    
    if (result.ok) {
      setDocuments(result.value);
    } else {
      setError(result.error instanceof Error ? result.error.message : 'Failed to load documents');
    }
    
    setIsLoading(false);
  }, [projectId]);

  // Load documents when component mounts or projectId changes
  useEffect(() => {
    if (projectId) {
      refreshDocuments();
    }
  }, [projectId, refreshDocuments]);

  // Business logic handlers
  const handleSelectDocument = useCallback((document: DocumentShallowType) => {
    // Update workspace current document selection
    selectDocument(document);
    
    if (onDocumentSelect) {
      onDocumentSelect(document);
    } else {
      // Default navigation behavior
      navigate(`/projects/${projectId}/documents/${document.id}/original-file`);
    }
  }, [onDocumentSelect, selectDocument, navigate, projectId]);

  // Navigation handler to go back to projects list
  const handleBackToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  // CRUD handlers
  const handleUploadDocuments = useCallback(() => {
    setIsUploadDialogOpen(true);
  }, []);

  const handleUploadDocumentsSubmit = useCallback(async (uploadData: DocumentBulkUploadRequestType) => {
    const result = await DocumentsAPI.uploadDocuments(uploadData);
    
    if (result.ok) {
      setIsUploadDialogOpen(false);
      // Refresh the documents list
      await refreshDocuments();
    } else {
      // Error handling is done in the API, just re-throw to keep dialog open
      throw result.error;
    }
  }, [refreshDocuments]);

  const handleEditDocument = useCallback((document: DocumentShallowType) => {
    setSelectedDocumentForEdit(document);
    setIsEditDialogOpen(true);
  }, []);

  const handleEditDocumentSubmit = useCallback(async (documentData: { description?: string }) => {
    if (!selectedDocumentForEdit) return;
    
    // Transform dialog data to API format
    const updateData: DocumentUpdateType = {
      description: documentData.description || undefined,
    };
    
    const result = await DocumentsAPI.updateDocument(selectedDocumentForEdit.id, updateData);
    
    if (result.ok) {
      setIsEditDialogOpen(false);
      setSelectedDocumentForEdit(null);
      // Refresh the documents list
      await refreshDocuments();
    } else {
      // Error handling is done in the API, just re-throw to keep dialog open
      throw result.error;
    }
  }, [selectedDocumentForEdit, refreshDocuments]);

  const handleDeleteDocument = useCallback((document: DocumentShallowType) => {
    setSelectedDocumentForDelete(document);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteDocumentConfirm = useCallback(async () => {
    if (!selectedDocumentForDelete) return;
    
    const result = await DocumentsAPI.deleteDocuments([selectedDocumentForDelete]);
    
    if (result.ok) {
      setIsDeleteDialogOpen(false);
      setSelectedDocumentForDelete(null);
      // Refresh the documents list
      await refreshDocuments();
    } else {
      // Error handling is done in the API, just re-throw to keep dialog open
      throw result.error;
    }
  }, [selectedDocumentForDelete, refreshDocuments]);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setSelectedDocumentForDelete(null);
  }, []);

  const handleCopyDocumentId = useCallback((document: DocumentShallowType) => {
    navigator.clipboard.writeText(document.id);
    toast.success('Document ID copied to clipboard', {
      description: `ID: ${document.id}`,
    });
  }, []);

  // Dialog state and handlers
  const dialogState = useMemo(() => ({
    upload: {
      isOpen: isUploadDialogOpen,
      onClose: () => setIsUploadDialogOpen(false),
      onSubmit: handleUploadDocumentsSubmit,
    },
    edit: {
      isOpen: isEditDialogOpen,
      onClose: () => setIsEditDialogOpen(false),
      onSubmit: handleEditDocumentSubmit,
      document: selectedDocumentForEdit,
    },
    delete: {
      isOpen: isDeleteDialogOpen,
      onClose: handleCloseDeleteDialog,
      onConfirm: handleDeleteDocumentConfirm,
      selectedDocument: selectedDocumentForDelete,
    },
  }), [
    isUploadDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    selectedDocumentForEdit,
    selectedDocumentForDelete,
    handleUploadDocumentsSubmit,
    handleEditDocumentSubmit,
    handleDeleteDocumentConfirm,
    handleCloseDeleteDialog,
  ]);

  // Action handlers for table
  const actionHandlers = useMemo(() => ({
    onSelectDocument: handleSelectDocument,
    onCreateDocument: handleUploadDocuments, // Maps to upload for documents
    onEditDocument: handleEditDocument,
    onDeleteDocument: handleDeleteDocument,
    onCopyDocumentId: handleCopyDocumentId,
    onBackToProjects: handleBackToProjects,
  }), [
    handleSelectDocument,
    handleUploadDocuments,
    handleEditDocument,
    handleDeleteDocument,
    handleCopyDocumentId,
    handleBackToProjects,
  ]);

  return {
    // State
    projectId,
    documents,
    currentDocument: state.currentDocument,
    isLoading,
    error,
    
    // Dialog state and handlers
    dialogState,
    
    // Action handlers
    actionHandlers,
    
    // Utility functions
    refreshDocuments,
  };
}
