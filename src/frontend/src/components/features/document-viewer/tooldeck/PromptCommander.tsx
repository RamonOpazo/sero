import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Trash2, Plus, Undo2 } from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { MinimalDocumentType } from "@/types";
import AddPromptDialog from "../dialogs/AddPromptDialog";
import PromptsList from "./PromptsList";
import { usePrompts } from "../core/PromptProvider";

interface PromptControlsProps {
  document: MinimalDocumentType;
}

/**
 * Prompt controls component
 * Manages prompt visibility, saving, and clearing operations
 */
export default function PromptManagement({ document }: PromptControlsProps) {
  const {
    state: { prompts, isLoading, isCreating, error },
    loadPrompts,
    createPrompt
  } = usePrompts();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Load prompts when component mounts
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // Calculate prompt statistics
  const promptStats = useMemo(() => {
    const totalCount = prompts?.length || 0;
    return {
      totalCount,
    };
  }, [prompts]);

  // Add new rule using PromptManager
  const handleAddRule = useCallback(async (ruleData: {
    type: string;
    title: string;
    rule: string;
    priority: 'high' | 'medium' | 'low';
    enabled: boolean;
  }) => {
    try {
      // Transform rule data to prompt format
      const promptText = `Rule Type: ${ruleData.type}\n` +
                        `Priority: ${ruleData.priority.toUpperCase()}\n` +
                        `Title: ${ruleData.title}\n\n` +
                        `Instructions:\n${ruleData.rule}`;
      
      // Map priority to temperature (AI creativity level)
      const temperatureMap = {
        'high': 0.1,    // Low creativity for critical compliance rules
        'medium': 0.3,  // Moderate creativity for important rules
        'low': 0.5      // Higher creativity for optional rules
      };
      
      const promptData = {
        text: promptText,
        languages: ['english', 'castillian'],
        temperature: temperatureMap[ruleData.priority],
        document_id: document.id
      };
      
      const result = await createPrompt(promptData);
      
      if (result.ok) {
        toast.success(`${ruleData.title} rule added successfully`);
        setShowAddDialog(false);
      } else {
        toast.error('Failed to add AI rule');
      }
      
    } catch (error) {
      console.error('Error adding rule:', error);
      toast.error('Failed to add AI rule');
    }
  }, [createPrompt, document.id]);

  // Save all prompts (placeholder)
  const handleSaveAllPrompts = useCallback(() => {
    toast.info('Save all prompts functionality to be implemented');
  }, []);

  // Discard all unsaved changes (placeholder)
  const handleDiscardAllChanges = useCallback(() => {
    toast.info('Discard changes functionality to be implemented');
  }, []);

  // Clear all prompts (placeholder)
  const handleClearAll = useCallback(() => {
    if (promptStats.totalCount === 0) {
      toast.info('No prompts to clear');
      return;
    }
    
    toast.info('Clear all prompts functionality to be implemented');
  }, [promptStats.totalCount]);

  // Handle add prompt button
  const handleOpenAddDialog = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setShowAddDialog(false);
  }, []);

  if (error) {
    return (
      <div className="text-xs text-destructive p-3 border border-destructive/20 bg-destructive/5 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Prompt Statistics */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Prompts</span>
          <span className="text-xs font-mono">{promptStats.totalCount}</span>
        </div>
      </div>
      
      <Separator />
      
      {/* Action Controls */}
      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleOpenAddDialog}
          disabled={isLoading || isCreating}
          className="w-full justify-start h-9 text-xs"
        >
          <Plus className="mr-2 h-3 w-3" />
          Add Rule
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveAllPrompts}
          disabled={isLoading || promptStats.totalCount === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Save className="mr-2 h-3 w-3" />
          Save all changes
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDiscardAllChanges}
          disabled={isLoading || promptStats.totalCount === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Undo2 className="mr-2 h-3 w-3" />
          Discard all changes
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAll}
          disabled={isLoading || promptStats.totalCount === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Clear all
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <PromptsList documentId={document.id} />
      </div>
      
      {/* Add Rule Dialog */}
      <AddPromptDialog
        isOpen={showAddDialog}
        onClose={handleCloseAddDialog}
        onConfirm={handleAddRule}
        isSubmitting={isCreating}
      />
    </div>
  );
}
