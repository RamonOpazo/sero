import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FileText, ArrowLeft, Lock, MessageSquare, Target, Info } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { PasswordDialog } from '@/components/dialogs/PasswordDialog';
import DocumentViewer from '@/components/features/document-viewer/DocumentViewer';
import { storePassword } from '@/utils/passwordManager';
import { useRefactorFiles } from '@/hooks/useRefactorFiles';
import type { DocumentType, DocumentShallowType, FileType } from '@/types';
import { FileTypeEnumSchema } from '@/types/enums';

interface RefactorFileViewerProps {
  fileType: 'original' | 'redacted';
}

export function RefactorFileViewer({ fileType }: RefactorFileViewerProps) {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();
  
  // Local state for document info
  const [document, setDocument] = useState<DocumentShallowType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerTab, setViewerTab] = useState('preview');
  
  // Password dialog state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isValidatingPassword, setIsValidatingPassword] = useState(false);
  const [userCancelledPassword, setUserCancelledPassword] = useState(false);
  
  // Use refactor files hook for file loading
  const { loadFileWithData, currentFileData, loading: fileLoading, error: fileError } = useRefactorFiles();

  // Fetch document data on mount
  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) return;
      
      try {
        setLoading(true);
        const result = await api.safe.get(`/documents/id/${documentId}`);
        
        if (result.ok) {
          setDocument(result.value);
          
          // Auto-prompt for password if we haven't cancelled and no file is loaded
          if (!userCancelledPassword && !currentFileData) {
            setIsPasswordDialogOpen(true);
          }
        } else {
          setError('Failed to load document');
        }
      } catch (err) {
        setError('Failed to load document');
        console.error('Error loading document:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, userCancelledPassword, currentFileData]);

  const handleBackToDocuments = () => {
    navigate(`/projects/${projectId}/documents`);
  };

  const handlePasswordConfirm = useCallback(async (password: string) => {
    if (!document) return;

    setIsValidatingPassword(true);
    setPasswordError(null);

    try {
      // Find the appropriate file based on fileType
      const targetFileType = fileType === 'original' 
        ? FileTypeEnumSchema.enum.original 
        : FileTypeEnumSchema.enum.redacted;
        
      const targetFile = document.files?.find((f: any) => f.file_type === targetFileType);
      
      if (!targetFile) {
        setPasswordError(`No ${fileType} file found for this document`);
        return;
      }
      
      // Load the file with data
      await loadFileWithData(targetFile.id, password);
      
      if (!fileError) {
        // Store the password for the DocumentViewer to use
        storePassword(document.id, targetFile.id, password);
        
        // Success - close dialog
        setIsPasswordDialogOpen(false);
        setPasswordError(null);
        
        toast.success('File loaded successfully!', {
          description: `Loaded ${targetFile.filename || targetFile.id}`
        });
      } else {
        setPasswordError('Failed to load file. Please check your password and try again.');
      }
    } catch (error) {
      console.error('Password validation error:', error);
      setPasswordError('Failed to load file. Please check your password and try again.');
    } finally {
      setIsValidatingPassword(false);
    }
  }, [document, fileType, loadFileWithData, fileError]);

  const handlePasswordCancel = useCallback(() => {
    setIsPasswordDialogOpen(false);
    setPasswordError(null);
    setUserCancelledPassword(true);
  }, []);

  const handleRetryPassword = useCallback(() => {
    if (!userCancelledPassword) return;
    setIsPasswordDialogOpen(true);
    setPasswordError(null);
    setUserCancelledPassword(false);
  }, [userCancelledPassword]);

  // Create a document object compatible with DocumentViewer
  const documentForViewer = useMemo((): DocumentType | null => {
    if (!document || !currentFileData) {
      return null;
    }

    // Create a stable object to avoid unnecessary re-renders
    const viewerDocument: DocumentType = {
      id: document.id,
      name: document.name,
      description: document.description || '',
      created_at: document.created_at,
      updated_at: document.updated_at,
      user_id: document.user_id,
      files: [currentFileData.file],
      original_file: fileType === 'original' ? currentFileData.file : null,
      redacted_file: fileType === 'redacted' ? currentFileData.file : null,
      prompts: currentFileData.prompts,
      selections: currentFileData.selections
    };
    
    return viewerDocument;
  }, [document, currentFileData, fileType]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load file</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            onClick={handleBackToDocuments}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={handleBackToDocuments}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Documents</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {fileType === 'original' ? 'Original File' : 'Redacted File'}
          </h1>
          <p className="text-muted-foreground">
            Viewing {fileType} file for document ID: {documentId}
          </p>
        </div>
      </div>

      {/* File Content */}
      {!currentFileData && !userCancelledPassword && (
        <Card>
          <CardContent className="p-16 text-center">
            <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground mb-4">
              File Encrypted
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Document "{document?.name}" requires a password to decrypt the {fileType} file
            </p>
            <Button 
              onClick={() => setIsPasswordDialogOpen(true)}
              className="px-6 py-2"
            >
              Enter Password
            </Button>
          </CardContent>
        </Card>
      )}

      {!currentFileData && userCancelledPassword && (
        <Card>
          <CardContent className="p-16 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground mb-4">
              File Not Loaded
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You cancelled the password entry. Click below to try again.
            </p>
            <Button 
              onClick={handleRetryPassword}
              variant="outline"
              className="px-6 py-2"
            >
              Retry Password
            </Button>
          </CardContent>
        </Card>
      )}

      {currentFileData && (
        <div className="space-y-6">
          {/* File Info Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <h3 className="font-semibold">{document?.name}</h3>
                    <Badge variant="outline">{currentFileData.file.file_type}</Badge>
                    <Badge variant="secondary">{fileType}</Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Size: {formatFileSize(currentFileData.file.file_size)}</span>
                    <span>Type: {currentFileData.file.mime_type}</span>
                    <span>Hash: {currentFileData.file.file_hash.substring(0, 8)}...</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{currentFileData.prompts.length} Prompts</span>
                  </Badge>
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Target className="h-3 w-3" />
                    <span>{currentFileData.selections.length} Selections</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* File Viewer Tabs */}
          <Card className="h-[calc(100vh-300px)]">
            <Tabs value={viewerTab} onValueChange={setViewerTab} className="flex-1 flex flex-col h-full">
              <div className="px-6 pt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="preview" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Preview</span>
                  </TabsTrigger>
                  <TabsTrigger value="prompts" className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Prompts</span>
                    {currentFileData.prompts.length > 0 && (
                      <Badge variant="outline" className="ml-1">
                        {currentFileData.prompts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="selections" className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Selections</span>
                    {currentFileData.selections.length > 0 && (
                      <Badge variant="outline" className="ml-1">
                        {currentFileData.selections.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="info" className="flex items-center space-x-2">
                    <Info className="h-4 w-4" />
                    <span>Info</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Preview Tab */}
              <TabsContent value="preview" className="flex-1 p-0 m-0">
                {documentForViewer ? (
                  <div className="h-full p-4">
                    <MemoizedDocumentViewer document={documentForViewer} />
                  </div>
                ) : (
                  <CardContent className="flex-1 p-0 h-full">
                    <div className="flex items-center justify-center h-full bg-muted/10 rounded-lg">
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium text-muted-foreground">PDF Preview</p>
                        <p className="text-sm text-muted-foreground">
                          File loaded successfully ({formatFileSize(currentFileData.blob.size)})
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Unable to initialize document viewer
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </TabsContent>

              {/* Other tabs with prompts, selections, info... */}
              <TabsContent value="prompts" className="flex-1 p-6">
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{currentFileData.prompts.length} prompts configured</p>
                </div>
              </TabsContent>

              <TabsContent value="selections" className="flex-1 p-6">
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{currentFileData.selections.length} selections made</p>
                </div>
              </TabsContent>

              <TabsContent value="info" className="flex-1 p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">File Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID:</span>
                        <span className="font-mono">{currentFileData.file.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{currentFileData.file.file_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MIME Type:</span>
                        <span>{currentFileData.file.mime_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span>{formatFileSize(currentFileData.file.file_size)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      )}

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={handlePasswordCancel}
        onConfirm={handlePasswordConfirm}
        error={passwordError}
        isLoading={isValidatingPassword}
      />
    </div>
  );
}

// Memoized DocumentViewer to prevent unnecessary re-renders
const MemoizedDocumentViewer = memo(DocumentViewer, (prevProps, nextProps) => {
  // Custom comparison function to check if document props are actually different
  const prevDoc = prevProps.document;
  const nextDoc = nextProps.document;
  
  if (!prevDoc && !nextDoc) return true;
  if (!prevDoc || !nextDoc) return false;
  
  // Compare relevant fields that affect rendering
  return (
    prevDoc.id === nextDoc.id &&
    prevDoc.name === nextDoc.name &&
    prevDoc.files?.length === nextDoc.files?.length &&
    prevDoc.files?.[0]?.id === nextDoc.files?.[0]?.id &&
    prevDoc.files?.[0]?.file_hash === nextDoc.files?.[0]?.file_hash
  );
});
