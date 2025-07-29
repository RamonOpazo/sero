import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";

type PDFContextType = {
  pageRefs: React.RefObject<Map<number, HTMLElement>>;
  registerPage: (el: HTMLElement | null, index: number) => void;
};

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const usePDFContext = () => {
  const context = useContext(PDFContext);
  if (!context) {
    throw new Error("usePDFContext must be used within a PDFProvider");
  }
  return context;
};

export const PDFProvider = ({ children }: { children: ReactNode }) => {
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map());

  const registerPage = (el: HTMLElement | null, index: number) => {
    if (el) {
      pageRefs.current.set(index, el);
    } else {
      pageRefs.current.delete(index);
    }
  };

  return (
    <PDFContext.Provider value={{ pageRefs, registerPage }}>
      {children}
    </PDFContext.Provider>
  );
};
