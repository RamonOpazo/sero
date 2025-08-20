import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Document, Page } from "react-pdf";
import { toast } from "sonner";
import { type MinimalDocumentType } from "@/types";
import { useViewportState } from '../../providers/viewport-provider';

type Props = {
  document: MinimalDocumentType;
  onDocumentSizeChange?: (size: { width: number; height: number }) => void;
};

export default function RenderLayer({ document, onDocumentSizeChange }: Props) {
  const {
    zoom,
    currentPage,
    setCurrentPage,
    setNumPages,
    setDocumentContainer,
    isViewingProcessedDocument,
    registerPage,
    setIsRendered,
  } = useViewportState();
  
  // Create navigation object for compatibility
  const navigation = { isViewingProcessedDocument };
  
  // Compatibility function for triggerUpdate (no-op in new system)
  const triggerUpdate = () => {};

  const [blob, setBlob] = useState<Blob | null>(null);
  const [renderZoom, setRenderZoom] = useState(zoom); // The zoom level actually used for rendering
  const zoomDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const documentInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (documentInnerRef.current) {
      setDocumentContainer(documentInnerRef.current);
    }
  }, [setDocumentContainer]);

  // Use the blob from the document (already loaded and decrypted)
  useEffect(() => {
    const fileToLoad = navigation.isViewingProcessedDocument ? document.redacted_file : document.original_file;

    if (!fileToLoad) {
      console.info('[RenderLayer] No fileToLoad for view', {
        viewingProcessed: navigation.isViewingProcessedDocument,
        redactedId: document.redacted_file?.id,
        originalId: document.original_file?.id,
      });
      setBlob(null);
      return;
    }
    
    setIsRendered(false);
    
    // The document should already contain the decrypted blob from FileViewer
    // Look for the blob in the files array - each file should have its blob attached
    const fileWithBlob = document.files?.find(f => f.id === fileToLoad.id);
    
    const hasBlob = !!(fileWithBlob && 'blob' in (fileWithBlob as any) && (fileWithBlob as any).blob instanceof Blob);
    console.info('[RenderLayer] Selecting file', {
      selectedId: fileToLoad.id,
      selectedType: (fileToLoad as any).file_type,
      hasBlob,
      availableFiles: (document.files || []).map((f: any) => ({ id: f.id, type: f.file_type, hasBlob: !!(f as any).blob })),
    });

    if (hasBlob) {
      setBlob((fileWithBlob as any).blob as Blob);
      setCurrentPage(0); // reset on new file
    } else {
      // Fallback: The document viewer might be called with a blob that's stored elsewhere
      // Check if the document itself has a blob property for this use case
      console.warn('[RenderLayer] No blob found in file structure, document may need to be reloaded');
      setBlob(null);
    }
  }, [
    // Only re-run when the actual file changes, not when the document object reference changes
    navigation.isViewingProcessedDocument ? document.redacted_file?.id : document.original_file?.id,
    navigation.isViewingProcessedDocument,
    setCurrentPage, 
    setIsRendered
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
  if (!blob) return <div className="text-red-500">Unable to load file</div>;

  return (
    <div
      id="__document_layer__"
      ref={documentInnerRef}
      className="relative"
      // No transform styles - the parent UnifiedViewport handles all transformations
    >
      <Document
        file={blob}
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
