import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Document, Page } from "react-pdf";
import { type MinimalDocumentType } from "@/types";
import { useViewportState } from '../../providers/viewport-provider';

type Props = {
  document: MinimalDocumentType; // initial snapshot; live doc comes from viewport state
  onDocumentSizeChange?: (size: { width: number; height: number }) => void;
};

export default function RenderLayer({ document: initialDocument, onDocumentSizeChange }: Props) {
  const {
    document: liveDocument,
    zoom,
    currentPage,
    setCurrentPage,
    setNumPages,
    setDocumentContainer,
    isViewingProcessedDocument,
    registerPage,
    setIsRendered,
    volatileBlob,
    volatileForProcessed,
  } = useViewportState();
  
  // Prefer the live document from state; fall back to the initial prop
  const document = liveDocument ?? initialDocument;
  
  // Create navigation object for compatibility
  const navigation = { isViewingProcessedDocument };
  
  // Compatibility function for triggerUpdate (no-op in new system)
  const triggerUpdate = () => {};

  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [volatileObjectUrl, setVolatileObjectUrl] = useState<string | null>(null);
  const [urlKey, setUrlKey] = useState<string>("init");
  const [renderZoom, setRenderZoom] = useState(zoom); // The zoom level actually used for rendering
  const zoomDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const documentInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (documentInnerRef.current) {
      setDocumentContainer(documentInnerRef.current);
    }
  }, [setDocumentContainer]);

  // Derive a cache key that changes when the underlying file bytes likely change
  const viewingProcessed = navigation.isViewingProcessedDocument;
  const selectedPtr = viewingProcessed ? document.redacted_file : document.original_file;
  const selectedId = selectedPtr?.id;
  const selectedFileEntry: any = document.files?.find(f => f.id === selectedId);
  const selectedBlobSize = (selectedFileEntry && 'blob' in selectedFileEntry && selectedFileEntry.blob instanceof Blob)
    ? (selectedFileEntry.blob as Blob).size
    : 0;
  const selectedFileSize = (selectedPtr as any)?.file_size ?? 0;
  const selectedUpdatedAt = (selectedPtr as any)?.updated_at ?? '';
  const cacheKey = `${selectedId || 'none'}:${selectedFileSize}:${selectedUpdatedAt}:${selectedBlobSize}`;

  // Create a fresh object URL whenever the blob changes; revoke old URLs to prevent leaks
  useEffect(() => {
    if (!blob) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setObjectUrl(null);
      return;
    }
    const newUrl = URL.createObjectURL(blob);
    // Unique key to force remounts of <Document>
    const newKey = `${Date.now()}-${blob.size}-${Math.random().toString(36).slice(2)}`;
    setObjectUrl(newUrl);
    setUrlKey(newKey);
    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [blob]);

  // Use the blob from the document (already loaded and decrypted)
  useEffect(() => {
    const fileToLoad = selectedPtr;

    if (!fileToLoad) {
      console.info('[RenderLayer] No fileToLoad for view', {
        viewingProcessed,
        redactedId: document.redacted_file?.id,
        originalId: document.original_file?.id,
      });
      setBlob(null);
      return;
    }
    
    setIsRendered(false);
    
    // The document should already contain the decrypted blob from FileViewer
    // Look for the blob in the files array - each file should have its blob attached
    const fileWithBlob = selectedFileEntry;
    
    const hasBlob = !!(fileWithBlob && 'blob' in (fileWithBlob as any) && (fileWithBlob as any).blob instanceof Blob);
    console.info('[RenderLayer] Selecting file', {
      selectedId: fileToLoad.id,
      selectedType: (fileToLoad as any).file_type,
      hasBlob,
      blobSize: hasBlob ? (fileWithBlob as any).blob.size : 0,
      fileSize: (fileToLoad as any)?.file_size,
      updatedAt: (fileToLoad as any)?.updated_at,
      availableFiles: (document.files || []).map((f: any) => ({ id: f.id, type: f.file_type, hasBlob: !!(f as any).blob })),
    });

    if (hasBlob) {
      setBlob((fileWithBlob as any).blob as Blob);
      setCurrentPage(0); // reset on new file
    } else {
      // Fallback: The document viewer might be called with a blob that's stored elsewhere
      console.warn('[RenderLayer] No blob found in file structure, document may need to be reloaded');
      setBlob(null);
    }
  }, [
    // Re-run whenever the selected file or its likely-bytes change
    viewingProcessed,
    cacheKey,
    setCurrentPage,
    setIsRendered,
  ]);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(0);
  };

  const handlePageRenderSuccess = (page: any) => {
    // Update document size based on the actual rendered page
    if (page && page.width && page.height) {
      const newSize = { width: page.width, height: page.height };
      onDocumentSizeChange?.(newSize);
    }
    setIsRendered(true);
  };

  // Debounced zoom handling to prevent flicker during rapid zoom changes (mouse wheel)
  useEffect(() => {
    // Clear existing timeout
    if (zoomDebounceTimeoutRef.current) {
      clearTimeout(zoomDebounceTimeoutRef.current);
    }
    
    // For button clicks (large zoom changes), update immediately
    const zoomDifference = Math.abs(zoom - renderZoom);
    const isLargeZoomChange = zoomDifference > 0.05; // Button clicks typically cause larger changes
    
    if (isLargeZoomChange) {
      // Immediate update for button clicks
      setRenderZoom(zoom);
      setIsRendered(false);
    } else if (zoomDifference > 0.001) {
      // Debounced update for mouse wheel (small incremental changes)
      zoomDebounceTimeoutRef.current = setTimeout(() => {
        setRenderZoom(zoom);
        setIsRendered(false);
      }, 100); // Wait 100ms after zoom stops changing
    }
    
    triggerUpdate();
    
    return () => {
      if (zoomDebounceTimeoutRef.current) {
        clearTimeout(zoomDebounceTimeoutRef.current);
      }
    };
  }, [currentPage, zoom, renderZoom, triggerUpdate, setIsRendered]);
  
  // Handle page render completion
  const handlePageRenderComplete = (page: any) => {
    handlePageRenderSuccess(page);
  };

  if (!document) return <div className="text-red-500">No document selected</div>;
  // Build a persistent object URL for the volatile blob
  useEffect(() => {
    if (volatileBlob && volatileForProcessed && navigation.isViewingProcessedDocument) {
      const url = URL.createObjectURL(volatileBlob);
      setVolatileObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      // Clear volatile URL when not applicable
      if (volatileObjectUrl) {
        URL.revokeObjectURL(volatileObjectUrl);
      }
      setVolatileObjectUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volatileBlob, volatileForProcessed, navigation.isViewingProcessedDocument]);

  const effectiveBlobUrl = volatileObjectUrl ?? objectUrl;

  if (!effectiveBlobUrl) return <div className="text-red-500">Unable to load file</div>;

  return (
    <div
      id="__document_layer__"
      ref={documentInnerRef}
      className="relative"
      // No transform styles - the parent UnifiedViewport handles all transformations
    >
      <Document
        key={`${cacheKey}:${urlKey}:${effectiveBlobUrl}`}
        file={effectiveBlobUrl}
        onLoadSuccess={handleLoadSuccess}
        loading={<div>Loading pages…</div>}
        error={<div className="text-red-500">Failed to render PDF</div>}
        className="pdf-document"
      >
        <PageWrapper
          key={currentPage}
          index={currentPage}
          registerPage={registerPage}
        >
          <Page
            pageIndex={currentPage}
            scale={renderZoom} // Use debounced zoom for rendering to prevent flicker
            onRenderSuccess={handlePageRenderComplete}
            className="pdf-page shadow-lg pointer-events-none"
            renderTextLayer={false}
            renderAnnotationLayer={false}
            renderForms={false}
          />
        </PageWrapper>
      </Document>
    </div>
  );
}

type PageWrapperProps = {
  children: React.ReactNode;
  index: number;
  registerPage: (el: HTMLElement | null, index: number) => void;
};

function PageWrapper({ children, index, registerPage }: PageWrapperProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      registerPage(ref.current, index);
    }
  }, [ref.current, index, registerPage]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}
