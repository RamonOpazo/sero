import { createContext, useContext } from "react";
import { useDocumentViewerState } from "@/hooks/useDocumentViewerState";

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
  const context = useContext(DocumentViewerContext);
  if (!context) throw new Error("useDocumentViewerContext must be used within a DocumentViewerProvider");
  return context;
};
