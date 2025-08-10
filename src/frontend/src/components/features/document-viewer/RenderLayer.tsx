import { useEffect, useState, useRef, useLayoutEffect, useMemo } from "react";
import { Document, Page } from "react-pdf";
import { toast } from "sonner";
import { type DocumentType } from "@/types";
import { getPassword } from "@/utils/passwordManager";
import { getFileBlob } from "@/lib/api";
import { useDocumentViewerContext } from "@/context/DocumentViewerContext";
import { usePDFContext } from "@/context/PDFContext";

type Props = {
  document: DocumentType;
};

export default function DocumentLayer({ document }: Props) {
  const {
    zoom,
    currentPage,
    setCurrentPage,
    setNumPages,
    mode,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    setDocumentContainer,
    isViewingProcessedDocument,
  } = useDocumentViewerContext();

  const { registerPage, triggerUpdate, setIsRendered } = usePDFContext();

  const [blob, setBlob] = useState<Blob | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);

  const documentRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const documentInnerRef = useRef<HTMLDivElement>(null);
  
  // Stable reference for the PDF file object to prevent React-PDF warnings
  const pdfFileRef = useRef<{ data: ArrayBuffer } | null>(null);
  const lastArrayBufferRef = useRef<ArrayBuffer | null>(null);

  useEffect(() => {
    if (documentInnerRef.current) {
      setDocumentContainer(documentInnerRef.current);
    }
  }, [setDocumentContainer]);

  // Panning state
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Fetch and decrypt the file blob
  useEffect(() => {
    const fileToLoad = isViewingProcessedDocument ? document.redacted_file : document.original_file;

    if (!fileToLoad) {
      setBlob(null);
      return;
    }
    setPan({ x: 0, y: 0 });

    const fetchBlob = async () => {
      setIsRendered(false);
      const password = getPassword(fileToLoad.document_id, fileToLoad.id);
      if (!password) {
        toast.error("Missing password for file access");
        setBlob(null);
        return;
      }

      try {
        setLoading(true);
        const blobResult = await getFileBlob({
          file_id: fileToLoad.id,
          password,
          stream: true,
        });
        
        if (!blobResult.ok) {
          console.error('Failed to get blob:', blobResult.error);
          toast.error("Failed to download PDF file");
          setBlob(null);
          return;
        }
        
        setBlob(blobResult.value);
        setCurrentPage(0); // reset on new file
      } catch (error) {
        console.error('Error downloading PDF:', error);
        toast.error("Failed to download PDF file");
        setBlob(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBlob();
  }, [
    // Only re-run when the actual file changes, not when the document object reference changes
    isViewingProcessedDocument ? document.redacted_file?.id : document.original_file?.id,
    isViewingProcessedDocument,
    setCurrentPage, 
    setPan
  ]);

  // Convert blob to ArrayBuffer
  useEffect(() => {
    if (!blob) {
      setArrayBuffer(null);
      return;
    }

    const convertBlobToArrayBuffer = async () => {
      try {
        const buffer = await blob.arrayBuffer();
        setArrayBuffer(buffer);
      } catch (error) {
        console.error('Failed to convert blob to array buffer:', error);
        toast.error('Failed to process PDF file');
        setArrayBuffer(null);
      }
    };

    convertBlobToArrayBuffer();
  }, [blob]);

  // Create a stable PDF file object using useRef to prevent React-PDF warnings
  // This ensures the same object reference is reused when the ArrayBuffer hasn't changed
  const pdfFile = useMemo(() => {
    if (!arrayBuffer) {
      pdfFileRef.current = null;
      lastArrayBufferRef.current = null;
      return null;
    }
    
    // Only create a new file object if the ArrayBuffer has actually changed
    if (lastArrayBufferRef.current !== arrayBuffer) {
      pdfFileRef.current = { data: arrayBuffer };
      lastArrayBufferRef.current = arrayBuffer;
    }
    
    return pdfFileRef.current;
  }, [arrayBuffer]);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(0);
  };

  const handlePageRenderSuccess = () => {
    setIsRendered(true);
  };

  // When the current page or zoom changes, we are no longer "rendered" until the new page is done.
  useEffect(() => {
    setIsRendered(false);
    triggerUpdate();
  }, [currentPage, zoom, triggerUpdate, setIsRendered]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "pan") return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "pan" || !isPanning) return;
    e.preventDefault();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    });
  };

  const handleMouseUp = () => {
    if (mode !== "pan") return;
    setIsPanning(false);
  };

  const getCursor = () => {
    if (mode !== 'pan') return 'default';
    return isPanning ? 'grabbing' : 'grab';
  }

  if (!document) return <div className="text-red-500">No document selected</div>;
  if (loading) return <div className="text-yellow-500">Loading PDF...</div>;
  if (!blob) return <div className="text-red-500">Unable to load file</div>;
  if (!arrayBuffer || !pdfFile) return <div className="text-yellow-500">Processing PDF...</div>;

  return (
    <div
      id="__document_layer__"
      ref={documentRef}
      className="relative h-full w-full overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: getCursor() }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 2px 2px, color-mix(in srgb, var(--ring) 25%, transparent) 2px, transparent 0px)`,
          backgroundSize: `${25 * zoom}px ${25 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />
      {/* <ScrollArea ref={documentRef}> */}
        <div
          ref={documentInnerRef}
          className="absolute top-[50%] left-[50%]"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <Document
            file={pdfFile}
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
                scale={zoom}
                onRenderSuccess={handlePageRenderSuccess}
                className="pdf-page shadow-lg pointer-events-none"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                renderForms={false}
              />
            </PageWrapper>
          </Document>
        </div>
      {/* </ScrollArea> */}
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
  }, [ref.current, index]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}
