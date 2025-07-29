import { useRef, useState, useEffect } from "react";

export function usePDFPages() {
  // Mutable ref to hold page refs
  const pageRefs = useRef<HTMLElement[]>([]);

  // State to force re-render if needed
  // const [, setVersion] = useState(0);
  const [version, setVersion] = useState(0);

  const registerPage = (el: HTMLElement | null, index: number) => {
    console.log("registerPage called", { index, el });

    if (el) {
      // Update the mutable ref directly
      pageRefs.current[index] = el;

      // Trigger a state update to notify React, debounce or batch if needed
      // setVersion(v => v + 1);

      console.log("Updated pageRefs", pageRefs.current);
    }
  };

   // After render, update the version to trigger re-render *outside* commit phase
   useEffect(() => {
    console.log("Registered version pre setting:", version)
    setVersion(v => v + 1);
  }, [pageRefs.current.length]);

  return { pageRefs: pageRefs.current, registerPage };
}
