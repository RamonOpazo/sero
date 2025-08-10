import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FolderOpen, FileText, Eye } from 'lucide-react';
import { useRefactorProject } from '@/context/RefactorProjectProvider';
import { RefactorProjectsDataTable } from './RefactorProjectsDataTable';
import { RefactorDocumentsDataTable } from './RefactorDocumentsDataTable';
import { RefactorFileViewer } from './RefactorFileViewer';

export function RefactorMainView() {
  const { state, loadProjects } = useRefactorProject();
  const [activeTab, setActiveTab] = useState('projects');

  // Initialize active tab based on persisted state 
  useEffect(() => {
    // Set initial tab based on current state
    if (state.currentFile) {
      console.log('🎯 Setting initial tab to viewer (file loaded)');
      setActiveTab('viewer');
    } else if (state.currentDocument) {
      console.log('🎯 Setting initial tab to documents (document selected)');
      setActiveTab('documents');
    } else if (state.currentProject) {
      console.log('🎯 Setting initial tab to documents (project selected)');
      setActiveTab('documents');
    } else {
      console.log('🎯 Setting initial tab to projects (default)');
      setActiveTab('projects');
    }
  }, [state.currentProject, state.currentDocument, state.currentFile]); // Track state changes for initial setup

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Simple auto-switching: move forward when making selections
  useEffect(() => {
    if (state.currentProject && activeTab === 'projects') {
      console.log('🏠 Auto-switching to documents tab');
      setActiveTab('documents');
    }
  }, [state.currentProject, activeTab]);

  useEffect(() => {
    if (state.currentDocument && activeTab === 'documents') {
      console.log('👁️ Auto-switching to viewer tab');
      setActiveTab('viewer');
    }
  }, [state.currentDocument, activeTab]);

  return (
    <div className="flex flex-col space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SERO Document Management</h1>
            <p className="text-muted-foreground">
              Secure document processing and redaction system
            </p>
          </div>
          
          {/* Current Selection Status */}
          <div className="flex items-center space-x-2">
            {state.currentProject && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <FolderOpen className="h-3 w-3" />
                <span>{state.currentProject.name}</span>
              </Badge>
            )}
            {state.currentDocument && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <FileText className="h-3 w-3" />
                <span>{state.currentDocument.name}</span>
              </Badge>
            )}
            {state.currentFile && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>File Loaded</span>
              </Badge>
            )}
            
            {/* Debug info - remove this later */}
            {process.env.NODE_ENV === 'development' && (
              <Badge variant="outline" className="text-xs">
                Debug: P={!!state.currentProject} D={!!state.currentDocument} F={!!state.currentFile}
              </Badge>
            )}
          </div>
        </div>
        <Separator />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects" className="flex items-center space-x-2">
            <FolderOpen className="h-4 w-4" />
            <span>Projects</span>
            {state.projects.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {state.projects.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="documents" 
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Documents</span>
            {state.currentProject && state.documents.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {state.documents.length}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="viewer" 
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>File Viewer</span>
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FolderOpen className="h-5 w-5" />
                <span>Projects</span>
              </CardTitle>
              <CardDescription>
                Select a project to view its documents. Projects are loaded with shallow data for optimal performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RefactorProjectsDataTable />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Documents</span>
                {state.currentProject && (
                  <Badge variant="outline">
                    {state.currentProject.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {state.currentProject ? (
                  <>
                    Documents in project "{state.currentProject.name}". 
                    Select a document to view its files and processing details.
                  </>
                ) : (
                  'Please select a project first to view its documents.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {state.currentProject ? (
                <RefactorDocumentsDataTable />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No project selected</p>
                  <p className="text-sm">Switch to the Projects tab to select a project</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Viewer Tab */}
        <TabsContent value="viewer" className="mt-6">
          <Card className="h-[calc(100vh-200px)]">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>File Viewer</span>
                {state.currentDocument && (
                  <Badge variant="outline">
                    {state.currentDocument.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {state.currentFile ? (
                  `Viewing file with prompts and selections for document processing.`
                ) : state.currentDocument ? (
                  'Select a file from the document to view it here.'
                ) : (
                  'Please select a document first to access file viewing.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {state.currentDocument ? (
                <RefactorFileViewer />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Document Selected</p>
                    <p className="text-sm">
                      Select a document from the Documents tab to view its file
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
