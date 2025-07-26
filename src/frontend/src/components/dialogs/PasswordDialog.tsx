import { useState } from 'react'
import {
  Dialog,
  DialogOverlay,
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

export function PasswordDialog({ isOpen, onClose, onConfirm, error, isLoading }: PasswordDialogProps) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogOverlay />
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
