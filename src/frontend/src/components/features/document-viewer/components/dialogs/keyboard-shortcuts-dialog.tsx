import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

interface KeyboardShortcutsDialogProps {
  isVisible: boolean,
  onToggleVisibility: () => void,
}

export default function KeyboardShortcutsDialog({ isVisible, onToggleVisibility }: KeyboardShortcutsDialogProps) {
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
        { key: "T", description: "Toggle original/redacted" },
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
  ]

  return (
    <Dialog
      open={isVisible}
      onOpenChange={(open) => { if (!open) onToggleVisibility(); }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 mb-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        {/* Wider body with two columns */}
        <div className="w-full grid grid-cols-2 gap-4 text-sm">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h2 className="font-semibold mb-2">{section.category}</h2>
              <div className="ml-4 space-y-1">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-muted-foreground">{item.description}</span>
                    <kbd className="px-1.5 py-0.5 border rounded text-[0.8rem] bg-background/70 whitespace-nowrap font-mono">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
