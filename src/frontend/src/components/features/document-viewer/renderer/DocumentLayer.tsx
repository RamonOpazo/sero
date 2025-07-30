import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Document, Page } from "react-pdf";
import { toast } from "sonner";
import { type File as FileType } from "@/types";
import { getPassword } from "@/utils/passwordManager";
import { getFileBlob } from "@/lib/api";
import { useDocumentViewerContext } from "@/context/DocumentViewerContext";
import { usePDFContext } from "@/context/PDFContext";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  file: FileType | null;
};

export default function DocumentLayer({ file }: Props) {
  const {
    zoom,
    currentPage,
    setCurrentPage,
    setNumPages,
  } = useDocumentViewerContext();

  const { registerPage, triggerUpdate, setIsRendered } = usePDFContext();

  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  const documentRef = useRef<HTMLDivElement>(null);

  // Fetch and decrypt the file blob
  useEffect(() => {
    if (!file) {
      setBlob(null);
      return;
    }

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
  }, [file]);

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
  }, [currentPage, zoom]);

  if (!file) return <div className="text-red-500">No file selected</div>;
  if (loading) return <div className="text-yellow-500">Loading PDF...</div>;
  if (!blob) return <div className="text-red-500">Unable to load file</div>;

  return (
    <div
      id="__document_layer__"
      ref={documentRef}
      className="relative pointer-events-none select-none w-full h-full"
    >
      <ScrollArea className="w-full h-full">
        <Document
          file={blob}
          onLoadSuccess={handleLoadSuccess}
          loading={<div>Loading pages…</div>}
          error={<div className="text-red-500">Failed to render PDF</div>}
        >
          <PageWrapper
            key={currentPage}
            index={currentPage}
            registerPage={registerPage}
          >
            <Page
              pageNumber={currentPage + 1}
              scale={zoom}
              onRenderSuccess={handlePageRenderSuccess}
            />
          </PageWrapper>
        </Document>
      </ScrollArea>
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
    <div ref={ref} className="flex justify-center">
      {children}
    </div>
  );
}
