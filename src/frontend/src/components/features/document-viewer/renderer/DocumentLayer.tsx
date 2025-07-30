import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Document, Page } from "react-pdf";
import { toast } from "sonner";
import { type File as FileType } from "@/types";
import { getPassword } from "@/utils/passwordManager";
import { getFileBlob } from "@/lib/api";
import { useDocumentViewerContext } from "@/context/DocumentViewerContext";
import { usePDFContext } from "@/context/PDFContext";
// import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  file: FileType | null;
};

export default function DocumentLayer({ file }: Props) {
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
  } = useDocumentViewerContext();

  const { registerPage, triggerUpdate, setIsRendered } = usePDFContext();

  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  const documentRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const documentInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (documentInnerRef.current) {
      setDocumentContainer(documentInnerRef.current);
    }
  }, [setDocumentContainer]);

  // Panning state
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Fetch and decrypt the file blob
  useEffect(() => {
    if (!file) {
      setBlob(null);
      return;
    }
    setPan({ x: 0, y: 0 });

    const fetchBlob = async () => {
      setIsRendered(false);
      const password = getPassword(file.document_id, file.id);
      if (!password) {
        toast.error("Missing password for file access");
        setBlob(null);
        return;
      }

      try {
        setLoading(true);
        const blob = await getFileBlob({
          file_id: file.id,
          password,
          stream: true,
        });
        setBlob(blob);
        setCurrentPage(0); // reset on new file
      } catch (error) {
        toast.error("Failed to download PDF file");
        setBlob(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBlob();
  }, [file, setCurrentPage]);

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

  if (!file) return <div className="text-red-500">No file selected</div>;
  if (loading) return <div className="text-yellow-500">Loading PDF...</div>;
  if (!blob) return <div className="text-red-500">Unable to load file</div>;

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
                scale={zoom}
                onRenderSuccess={handlePageRenderSuccess}
                className="pdf-page shadow-lg"
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
