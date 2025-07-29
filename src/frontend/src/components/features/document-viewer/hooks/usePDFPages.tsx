import { useRef, useState, useCallback } from "react";

export function usePDFPages() {
  const pageRefs = useRef<HTMLElement[]>([]);
  // This state is just to trigger re-renders in the component that uses this hook.
  const [, forceUpdate] = useState(0);

  const registerPage = useCallback((el: HTMLElement | null, index: number) => {
    if (el) {
      pageRefs.current[index] = el;
    } else {
      // Clean up the ref if the component unmounts
      delete pageRefs.current[index];
    }
    // Force a re-render to ensure consumers get the updated refs.
    forceUpdate(v => v + 1);
  }, []);

  // Return the ref object itself, so consumers can use .current
  return { pageRefs, registerPage };
}
