import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface AddPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddPrompt: (text: string) => void
}

export function AddPromptDialog({ open, onOpenChange, onAddPrompt }: AddPromptDialogProps) {
  const [promptText, setPromptText] = useState('')

  const handleSubmit = () => {
    if (promptText.trim()) {
      onAddPrompt(promptText.trim())
      setPromptText('')
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setPromptText('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Prompt</DialogTitle>
          <DialogDescription>
            Enter the prompt text that will be applied to this document.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Enter your prompt here..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!promptText.trim()}>
            Add Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
