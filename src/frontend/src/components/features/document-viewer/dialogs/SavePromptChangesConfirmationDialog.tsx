import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Save, Loader2 } from "lucide-react";

interface SavePromptChangesConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  changesCount: number;
  isSaving: boolean;
}

export default function SavePromptChangesConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  changesCount,
  isSaving
}: SavePromptChangesConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [error, setError] = useState<string>("");

  const requiredText = "proceed";

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setConfirmationText("");
      setError("");
    }
  }, [isOpen]);

  const handleTextChange = (value: string) => {
    setConfirmationText(value);
    setError("");
  };

  const validateAndConfirm = async () => {
    if (confirmationText.trim().toLowerCase() !== requiredText.toLowerCase()) {
      setError(`You must type "${requiredText}" exactly to confirm`);
      return;
    }

    try {
      await onConfirm();
    } catch (error) {
      console.error("Error during save confirmation:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      validateAndConfirm();
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const isConfirmationMatch = confirmationText.trim().toLowerCase() === requiredText.toLowerCase();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save All Changes
          </DialogTitle>
          <DialogDescription>
            Permanently save all pending changes to the server. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Info alert with change summary */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  You are about to save <strong>{changesCount} change{changesCount === 1 ? '' : 's'}</strong> to the server.
                </div>
                <ul className="list-outside list-disc text-sm text-muted-foreground pl-4">
                  <li>All new prompts will be permanently created</li>
                  <li>All modified prompts will be updated</li>
                  <li>All deleted prompts will be removed from the server</li>
                  <li>This action cannot be undone once completed</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Error alert - placed right after info for better structure */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation-input" className="text-sm font-medium">
              Type "{requiredText}" to confirm
            </Label>
            <Input
              id="confirmation-input"
              type="text"
              value={confirmationText}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={requiredText}
              className="w-full"
              disabled={isSaving}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              This confirmation is required to prevent accidental saves
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={validateAndConfirm} 
            disabled={isSaving || !isConfirmationMatch}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
