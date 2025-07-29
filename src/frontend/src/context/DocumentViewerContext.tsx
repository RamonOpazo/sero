import { createContext, useContext } from "react";
import { useDocumentViewerState } from "@/components/features/document-viewer/hooks/useDocumentViewerState";

const DocumentViewerContext = createContext<ReturnType<typeof useDocumentViewerState> | null>(null);

export const DocumentViewerProvider = ({ children }: { children: React.ReactNode }) => {
  const state = useDocumentViewerState();
  return (
    <DocumentViewerContext.Provider value={state}>
      {children}
    </DocumentViewerContext.Provider>
  );
};

export const useDocumentViewerContext = () => {
  const ctx = useContext(DocumentViewerContext);
  if (!ctx) throw new Error("useDocumentViewerContext must be used within a DocumentViewerProvider");
  return ctx;
};
