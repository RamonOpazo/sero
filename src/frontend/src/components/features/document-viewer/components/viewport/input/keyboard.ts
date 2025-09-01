import { useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import { toast } from 'sonner';
import { useViewportState, useViewportActions } from '@/components/features/document-viewer/providers/viewport-provider';
import type { ViewportAction } from '@/components/features/document-viewer/providers/viewport-provider';
import { useSelections } from '@/components/features/document-viewer/providers/selections-provider';

export interface KeyboardDeps {
  isPanning: boolean,
  setIsPanning: (v: boolean) => void,
  cancelDraw: () => void,
  showHelpOverlay: boolean,
  showInfoPanel: boolean,
  showSelectionsPanel: boolean,
  showPromptPanel: boolean,
  toggleHelpOverlay: () => void,
  toggleInfoPanel: () => void,
  toggleSelectionsPanel: () => void,
  togglePromptPanel: () => void,
  numPages: number,
  currentPage: number,
  setCurrentPage: (page: number) => void,
  zoom: number,
  dispatch: React.Dispatch<ViewportAction>,
  setMode: (mode: 'pan' | 'select') => void,
  deleteSelectedSelection: () => boolean,
  undo: () => void,
  redo: () => void,
  isViewingProcessedDocument: boolean,
}

export function createKeyboardHandler(deps: KeyboardDeps) {
  const {
    isPanning,
    setIsPanning,
    cancelDraw,
    showHelpOverlay,
    showInfoPanel,
    showSelectionsPanel,
    showPromptPanel,
    toggleHelpOverlay,
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
    numPages,
    currentPage,
    setCurrentPage,
    zoom,
    dispatch,
    setMode,
    deleteSelectedSelection,
    undo,
    redo,
    isViewingProcessedDocument,
  } = deps;

  return (event: KeyboardEvent) => {
    // Only handle if the viewport is focused or no other input is focused
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA'
    ) {
      return;
    }

    const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
    const isModifierPressed = ctrlKey || metaKey || altKey;

    switch (key) {
      case 'Escape':
        // Cancel current operation
        if (isPanning) {
          setIsPanning(false);
          // panStart is internal to mouse logic; keyboard only cancels panning flag
        }
        // Cancel any current selection drawing
        cancelDraw();
        // Close overlays/panels if open
        if (showHelpOverlay) {
          toggleHelpOverlay();
          event.preventDefault();
          break;
        }
        if (showInfoPanel) {
          toggleInfoPanel();
          event.preventDefault();
          break;
        }
        if (showSelectionsPanel) {
          toggleSelectionsPanel();
          event.preventDefault();
          break;
        }
        if (showPromptPanel) {
          togglePromptPanel();
          event.preventDefault();
          break;
        }
        event.preventDefault();
        break;

      // Navigation - Arrow keys for page navigation
      case 'ArrowLeft':
      case 'PageUp':
        if (!isModifierPressed && numPages > 1) {
          const newPage = Math.max(0, currentPage - 1);
          if (newPage !== currentPage) {
            setCurrentPage(newPage);
            toast.success(`Page ${newPage + 1} of ${numPages}`);
          }
          event.preventDefault();
        }
        break;

      case 'ArrowRight':
      case 'PageDown':
        if (!isModifierPressed && numPages > 1) {
          const newPage = Math.min(numPages - 1, currentPage + 1);
          if (newPage !== currentPage) {
            setCurrentPage(newPage);
            toast.success(`Page ${newPage + 1} of ${numPages}`);
          }
          event.preventDefault();
        }
        break;

      case 'Home':
        if (!isModifierPressed && numPages > 1) {
          if (currentPage !== 0) {
            setCurrentPage(0);
            toast.success('First page');
          }
          event.preventDefault();
        }
        break;

      case 'End':
        if (!isModifierPressed && numPages > 1) {
          const lastPage = numPages - 1;
          if (currentPage !== lastPage) {
            setCurrentPage(lastPage);
            toast.success('Last page');
          }
          event.preventDefault();
        }
        break;

      // Zoom controls with +/- keys (without modifiers)
      case '+':
      case '=':
        if (!isModifierPressed) {
          const newZoom = Math.min(zoom * 1.1, 3);
          if (newZoom !== zoom) {
            dispatch({ type: 'SET_ZOOM', payload: newZoom });
            toast.success(`Zoom ${Math.round(newZoom * 100)}%`);
          }
          event.preventDefault();
        } else if (ctrlKey || metaKey) {
          const newZoom = Math.min(zoom * 1.1, 3);
          if (newZoom !== zoom) {
            dispatch({ type: 'SET_ZOOM', payload: newZoom });
          }
          event.preventDefault();
        }
        break;

      case '-':
        if (!isModifierPressed) {
          const newZoom = Math.max(zoom / 1.1, 0.5);
          if (newZoom !== zoom) {
            dispatch({ type: 'SET_ZOOM', payload: newZoom });
            toast.success(`Zoom ${Math.round(newZoom * 100)}%`);
          }
          event.preventDefault();
        } else if (ctrlKey || metaKey) {
          const newZoom = Math.max(zoom / 1.1, 0.5);
          if (newZoom !== zoom) {
            dispatch({ type: 'SET_ZOOM', payload: newZoom });
          }
          event.preventDefault();
        }
        break;

      // Mode switching
      case 'p':
      case 'P':
        if (!isModifierPressed) {
          setMode('pan');
          toast.success('Panning mode activated', {
            description: 'Use left click and drag to pan around the document',
          });
          event.preventDefault();
        }
        break;

      case 's':
      case 'S':
        if (!isModifierPressed) {
          setMode('select');
          toast.success('Selection mode activated', {
            description: 'Click and drag to create selections',
          });
          event.preventDefault();
        }
        break;

      // Info panel toggle
      case 'i':
      case 'I':
        if (!isModifierPressed) {
          toggleInfoPanel();
          event.preventDefault();
        }
        break;

      // Selections panel toggle (L)
      case 'l':
      case 'L':
        if (!isModifierPressed) {
          toggleSelectionsPanel();
          event.preventDefault();
        }
        break;

      // Prompts panel toggle (R)
      case 'r':
      case 'R':
        if (!isModifierPressed) {
          togglePromptPanel();
          event.preventDefault();
        }
        break;

      // Help overlay toggle
      case 'h':
      case 'H':
        if (!isModifierPressed) {
          toggleHelpOverlay();
          event.preventDefault();
        }
        break;

      // Toggle between original and redacted (T)
      case 't':
      case 'T':
        if (!isModifierPressed) {
          dispatch({ type: 'SET_VIEWING_PROCESSED', payload: !isViewingProcessedDocument });
          event.preventDefault();
        }
        break;

      case ' ': // Spacebar for temporary pan mode
        if (!isModifierPressed) {
          // Reserved for temporary pan in selection mode
          event.preventDefault();
        }
        break;

      case 'g':
      case 'G':
        if (ctrlKey || metaKey) {
          // Show go-to-page dialog
          const pageInput = prompt(
            `Go to page (1-${numPages}):`,
            String(currentPage + 1),
          );
          if (pageInput !== null) {
            const pageNum = parseInt(pageInput.trim());
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
              const newPage = pageNum - 1; // Convert to 0-based
              setCurrentPage(newPage);
              toast.success(`Jumped to page ${pageNum}`);
            } else {
              toast.error(`Invalid page number. Enter a number between 1 and ${numPages}.`);
            }
          }
          event.preventDefault();
        }
        break;

      case 'Delete':
      case 'Backspace':
        if (!isModifierPressed) {
          // Delete the currently selected selection using new system
          const success = deleteSelectedSelection();
          if (success) {
            toast.success('Selection removed');
          } else {
            toast.info('No selections to remove');
          }
          event.preventDefault();
        }
        break;

      case 'y':
        if (ctrlKey || metaKey) {
          // Standard redo shortcut (works reliably)
          redo();
          toast.success('Redo');
          event.preventDefault();
        }
        break;

      case 'z':
        if ((ctrlKey || metaKey) && !altKey) {
          if (shiftKey) {
            // Alternative redo shortcut (may not work in all browsers)
            redo();
            toast.success('Redo');
          } else {
            // Standard undo shortcut
            undo();
            toast.success('Undo');
          }
          event.preventDefault();
        }
        break;

      case '0':
        if (ctrlKey || metaKey) {
          dispatch({ type: 'RESET_VIEW' });
          event.preventDefault();
        }
        break;
    }
  };
}

// Adapter hook: returns a stable keyboard handler wired to viewport and selection state
export function useKeyboardHandler() {
  const {
    isPanning,
    setIsPanning,
    zoom,
    dispatch,
    currentPage,
    numPages,
    setCurrentPage,
    setMode,
    showHelpOverlay,
    showInfoPanel,
    showSelectionsPanel,
    showPromptPanel,
    isViewingProcessedDocument,
  } = useViewportState();

  const {
    toggleHelpOverlay,
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
  } = useViewportActions();

  const { deleteSelectedSelection, undo, redo, cancelDraw } = useSelections();

  // Keep the generated handler in a ref and expose a stable proxy
  const handlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    handlerRef.current = createKeyboardHandler({
      isPanning,
      setIsPanning,
      cancelDraw,
      showHelpOverlay,
      showInfoPanel,
      showSelectionsPanel,
      showPromptPanel,
      toggleHelpOverlay,
      toggleInfoPanel,
      toggleSelectionsPanel,
      togglePromptPanel,
      numPages,
      currentPage,
      setCurrentPage,
      zoom,
      dispatch,
      setMode,
      deleteSelectedSelection,
      undo,
      redo,
      isViewingProcessedDocument,
    });
  }, [
    isPanning,
    setIsPanning,
    cancelDraw,
    showHelpOverlay,
    showInfoPanel,
    showSelectionsPanel,
    showPromptPanel,
    toggleHelpOverlay,
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
    numPages,
    currentPage,
    setCurrentPage,
    zoom,
    dispatch,
    setMode,
    deleteSelectedSelection,
    undo,
    redo,
    isViewingProcessedDocument,
  ]);

  return useCallback((e: KeyboardEvent) => handlerRef.current(e), []);
}
