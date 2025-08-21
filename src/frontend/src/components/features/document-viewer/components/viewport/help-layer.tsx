// import React from 'react';
// import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Keyboard } from 'lucide-react';

interface HelpOverlayProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function HelpOverlay({ isVisible, onToggleVisibility }: HelpOverlayProps) {
  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { key: "←/→", description: "Previous/Next page" },
        { key: "Page Up/Down", description: "Previous/Next page" },
        { key: "Home/End", description: "First/Last page" },
        { key: "Ctrl+G", description: "Go to specific page" },
      ]
    },
    {
      category: "View & Zoom",
      items: [
        { key: "+/-", description: "Zoom in/out" },
        { key: "Ctrl+0", description: "Reset view" },
        { key: "Mouse wheel", description: "Zoom at cursor" },
      ]
    },
    {
      category: "Modes",
      items: [
        { key: "P", description: "Pan mode" },
        { key: "S", description: "Selection mode" },
        { key: "Middle click", description: "Temporary pan" },
      ]
    },
    {
      category: "Selections",
      items: [
        { key: "Delete", description: "Remove last selection" },
        { key: "Ctrl+Z", description: "Undo selection changes" },
        { key: "Ctrl+Y", description: "Redo selection changes" },
      ]
    },
    {
      category: "Interface",
      items: [
        { key: "I", description: "Toggle info panel" },
        { key: "H", description: "Toggle this help" },
        { key: "Esc", description: "Cancel operation" },
      ]
    }
  ];

  // Transition similar to InfoLayer; keep mounted for exit animation
  const visibilityClasses = isVisible
    ? 'opacity-100 translate-y-0 pointer-events-auto'
    : 'opacity-0 -translate-y-2 pointer-events-none';

  return (
    <div
      className={`absolute inset-0 z-[2100] bg-black/50 backdrop-blur-xs p-4 flex flex-col gap-4 text-xs transition-all duration-200 ease-out ${visibilityClasses}`}
      onClick={onToggleVisibility}
      aria-hidden={!isVisible}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleVisibility}
        className="absolute top-4 right-4"
        aria-label="Close help"
      >
        <X />
      </Button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Keyboard className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Keyboard Shortcuts</h1>
      </div>

      {/* Sections laid out like Info layer (single column, left-ragged) */}
      <div className="bg-background/90 m-[100px] rounded-md p-8">
        <div className="grid grid-cols-2 gap-8">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h2 className="uppercase tracking-wider text-muted-foreground mb-2">{section.category}</h2>
              <div className="ml-4 space-y-1">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center">
                    <span className="text-md text-muted-foreground mr-2">{item.description}</span>
                    <kbd className="text-[0.8rem] px-1.5 py-1 border rounded-md bg-background/70 whitespace-nowrap font-mono">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Footer hint */}
        <div className="mt-10 text-center text-muted-foreground">
          <p>Press H or Esc to close</p>
        </div>
      </div>

    </div>
  );
}

export default HelpOverlay;
