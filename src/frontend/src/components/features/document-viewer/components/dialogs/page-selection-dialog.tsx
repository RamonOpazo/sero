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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";

interface PageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pageNumber: number | null) => void; // null means make it global
  currentPage: number;
  totalPages: number;
  selectionId?: string | null;
}

export default function PageSelectionDialog({
  isOpen,
  onClose,
  onConfirm,
  currentPage,
  totalPages
}: PageSelectionDialogProps) {
  const [isGlobal, setIsGlobal] = useState<boolean>(false);
  const [selectedPage, setSelectedPage] = useState<string>(String(currentPage + 1));
  const [error, setError] = useState<string>("");

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsGlobal(false); // Default to page-specific
      setSelectedPage(String(currentPage + 1));
      setError("");
    }
  }, [isOpen, currentPage]);

  const handlePageChange = (value: string) => {
    setSelectedPage(value);
    setError("");
  };

  const validateAndConfirm = () => {
    if (isGlobal) {
      onConfirm(null); // null indicates making it global
      return;
    }

    // For page-specific selections, validate the page number
    const pageNum = parseInt(selectedPage, 10);
    
    if (isNaN(pageNum)) {
      setError("Please enter a valid page number");
      return;
    }
    
    if (pageNum < 1) {
      setError("Page number must be at least 1");
      return;
    }
    
    if (pageNum > totalPages) {
      setError(`Page number cannot exceed ${totalPages}`);
      return;
    }

    // Convert to 0-indexed page number for internal use
    onConfirm(pageNum - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      validateAndConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose Target Page</DialogTitle>
          <DialogDescription>
            Configure how this selection should be displayed across the document.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Info alert with usage instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>Currently viewing page {currentPage + 1} of {totalPages}</div>
                <ul className="list-outside list-disc text-sm text-muted-foreground pl-4">
                  <li>Toggle switch to choose page-specific or global visibility</li>
                  <li>Page-specific selections appear only on the chosen page</li>
                  <li>Global selections appear on every page in the document</li>
                  <li>Enter page numbers between 1 and {totalPages} for page-specific mode</li>
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

          {/* Selection type switch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="global-switch" className="text-sm font-medium">
                  {isGlobal ? "Global Selection" : "Page-Specific Selection"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isGlobal 
                    ? "Appears on all pages in the document" 
                    : "Appears only on the specified page"
                  }
                </p>
              </div>
              <Switch
                id="global-switch"
                checked={isGlobal}
                onCheckedChange={(checked) => {
                  setIsGlobal(checked);
                  setError(""); // Clear any errors when switching modes
                }}
              />
            </div>
          </div>

          {/* Page number input - always show but disable when global is selected */}
          <div className={`space-y-2 transition-opacity ${isGlobal ? 'opacity-40' : 'opacity-100'}`}>
            <Label htmlFor="page-number" className={isGlobal ? 'text-muted-foreground' : ''}>
              Target Page Number
            </Label>
            <Input
              id="page-number"
              type="number"
              value={selectedPage}
              onChange={(e) => handlePageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              min="1"
              max={totalPages}
              placeholder={`Enter page number (1-${totalPages})`}
              className="w-full"
              disabled={isGlobal}
            />
            <p className="text-xs text-muted-foreground">
              {isGlobal 
                ? "Page number is not needed for global selections"
                : `Page must be between 1 and ${totalPages}`
              }
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={validateAndConfirm}>
            {isGlobal ? "Make Global" : "Assign to Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
