import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Keyboard } from 'lucide-react';

interface HelpOverlayProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function HelpOverlay({ isVisible, onToggleVisibility }: HelpOverlayProps) {
  if (!isVisible) return null;

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
        { key: "Ctrl+Shift+Z", description: "Redo selection changes" },
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

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onToggleVisibility}
    >
      <Card 
        className="w-full max-w-4xl max-h-[80vh] overflow-y-auto mx-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onToggleVisibility}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground flex-1">
                        {item.description}
                      </span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded whitespace-nowrap">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted border border-border rounded">H</kbd> or{' '}
              <kbd className="px-1 py-0.5 text-xs font-mono bg-muted border border-border rounded">Esc</kbd> to close this help
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HelpOverlay;
