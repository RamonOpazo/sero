import React, { useCallback } from 'react';
import { type DocumentType } from "@/types";
import { useViewerState } from '../hooks/useViewerState';

type Props = { 
  document: DocumentType;
  documentSize: { width: number; height: number };
  isVisible: boolean;
  onToggleVisibility: () => void;
};


export default function InfoLayer({ document, documentSize, isVisible, onToggleVisibility }: Props) {
  const { currentPage, numPages, zoom } = useViewerState();

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Get current file information
  const currentFile = document.original_file || document.redacted_file;
  const fileWithBlob = document.files?.find(f => f.id === currentFile?.id);

  // Early return if not visible - MUST be after all hooks
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex flex-col p-8 font-mono text-green-400"
      onClick={onToggleVisibility}
    >
      <div 
        className="flex-1 border-2 border-green-400 bg-black/80 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-green-400 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 animate-pulse"></div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-green-400">
              DOCUMENT INTELLIGENCE SYSTEM
            </h1>
          </div>
          <button 
            onClick={onToggleVisibility}
            className="text-red-400 hover:text-red-300 text-lg font-bold"
          >
            [X]
          </button>
        </div>
        
        {/* Simple terminal-style information display */}
        <div className="space-y-4 text-sm leading-relaxed overflow-auto flex-1">
          {/* Document title */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-yellow-400 uppercase tracking-wide mb-2">
              &gt;&gt; {document.name}
            </h2>
            {document.description && (
              <p className="text-green-300 italic">DESCRIPTION: {document.description}</p>
            )}
          </div>

          {/* Document Information */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="text-yellow-400 font-bold uppercase tracking-wide border-b border-green-400 pb-1 mb-3">
                [DOCUMENT INTEL]
              </h3>
              <div className="space-y-1 pl-2">
                <div>ID: <span className="text-cyan-400 font-mono">{document.id}</span></div>
                <div>CREATED: <span className="text-cyan-400">{formatDate(document.created_at)}</span></div>
                <div>UPDATED: <span className="text-cyan-400">{formatDate(document.updated_at)}</span></div>
                <div>USER: <span className="text-cyan-400 font-mono">{document.user_id}</span></div>
              </div>
            </div>

            {currentFile && (
              <div className="space-y-2">
                <h3 className="text-yellow-400 font-bold uppercase tracking-wide border-b border-green-400 pb-1 mb-3">
                  [FILE STATUS]
                </h3>
                <div className="space-y-1 pl-2">
                  <div>TYPE: <span className="text-red-400 font-bold bg-red-400/20 px-2">{currentFile.file_type.toUpperCase()}</span></div>
                  <div>FORMAT: <span className="text-cyan-400">{currentFile.mime_type}</span></div>
                  <div>SIZE: <span className="text-cyan-400">{formatFileSize(currentFile.file_size)}</span></div>
                  <div>HASH: <span className="text-cyan-400 font-mono text-xs">{currentFile.file_hash.substring(0, 16)}...</span></div>
                  {currentFile.filename && (
                    <div>FILE: <span className="text-cyan-400">{currentFile.filename}</span></div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-yellow-400 font-bold uppercase tracking-wide border-b border-green-400 pb-1 mb-3">
                [VIEWPORT]
              </h3>
              <div className="space-y-1 pl-2">
                <div>PAGE: <span className="text-cyan-400 font-bold">{currentPage + 1} / {numPages}</span></div>
                <div>ZOOM: <span className="text-cyan-400">{Math.round(zoom * 100)}%</span></div>
                <div>SIZE: <span className="text-cyan-400">{documentSize.width} × {documentSize.height}px</span></div>
                <div>SCALED: <span className="text-cyan-400">{Math.round(documentSize.width * zoom)} × {Math.round(documentSize.height * zoom)}px</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-yellow-400 font-bold uppercase tracking-wide border-b border-green-400 pb-1 mb-3">
                [OPERATIONS]
              </h3>
              <div className="space-y-1 pl-2">
                <div>PROMPTS: <span className="text-orange-400 font-bold">{document.prompts?.length || 0} CONFIGURED</span></div>
                <div>SELECTIONS: <span className="text-orange-400 font-bold">{document.selections?.length || 0} ACTIVE</span></div>
                <div>STATUS: <span className="text-green-400 font-bold animate-pulse">ONLINE</span></div>
              </div>
            </div>
          </div>

          {/* Footer instruction */}
          <div className="border-t border-green-400 pt-4 mt-8 text-center">
            <p className="text-green-300 text-xs uppercase tracking-widest">
              PRESS [ESC] OR CLICK OUTSIDE TO CLOSE TERMINAL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
