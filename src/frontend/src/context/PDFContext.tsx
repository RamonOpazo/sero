import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type PDFContextType = {
  pageRefs: React.RefObject<Map<number, HTMLElement>>;
  registerPage: (el: HTMLElement | null, index: number) => void;
  triggerUpdate: () => void;
  isRendered: boolean;
  setIsRendered: (isRendered: boolean) => void;
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
  const [isRendered, setIsRendered] = useState(false);
  const [, forceUpdate] = useState(0);

  const triggerUpdate = useCallback(() => {
    forceUpdate(v => v + 1);
  }, []);

  const registerPage = useCallback((el: HTMLElement | null, index: number) => {
    if (el) {
      pageRefs.current.set(index, el);
    } else {
      pageRefs.current.delete(index);
    }
    triggerUpdate();
  }, [triggerUpdate]);

  return (
    <PDFContext.Provider value={{ pageRefs, registerPage, triggerUpdate, isRendered, setIsRendered }}>
      {children}
    </PDFContext.Provider>
  );
};
