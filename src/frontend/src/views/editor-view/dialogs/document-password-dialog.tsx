import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  // DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PasswordDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => void
  error?: string | null
  isLoading?: boolean
}

export function DocumentPasswordDialog({ isOpen, onClose, onConfirm, error, isLoading }: PasswordDialogProps) {
  const [password, setPassword] = useState('')

  const handleConfirm = () => {
    if (!password.trim()) return
    onConfirm(password)
    // Don't clear password on error, only on successful close
  }

  const handleClose = () => {
    setPassword('')
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Enter Password</DialogTitle>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoFocus
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !password.trim()}>
            {isLoading ? 'Validating...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
