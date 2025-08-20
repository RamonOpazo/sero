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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { 
  Info,
  AlertTriangle
} from "lucide-react";

// Actionable rule types for AI document processing
const RULE_TYPES = {
  'identify-and-mark': {
    label: 'Identify and Mark',
    description: 'Find specific content and highlight it for review',
    priority: 'high',
    actionText: 'Identify and mark',
    baseRule: 'Find and highlight all instances of the specified content type for manual review.'
  },
  'redact-content': {
    label: 'Redact Content',
    description: 'Automatically remove or obscure sensitive information',
    priority: 'high',
    actionText: 'Redact all',
    baseRule: 'Automatically remove or obscure all instances of the specified sensitive information.'
  },
  'preserve-content': {
    label: 'Preserve Content',
    description: 'Ensure specific content is never modified or removed',
    priority: 'medium',
    actionText: 'Preserve all',
    baseRule: 'Protect the specified content from any modifications during processing.'
  },
  'exclude-content': {
    label: 'Exclude Content',
    description: 'Ignore specific content during processing',
    priority: 'low',
    actionText: 'Exclude all',
    baseRule: 'Skip the specified content during all AI analysis and processing.'
  },
  'custom': {
    label: 'Custom Rule',
    description: 'Define your own processing instructions',
    priority: 'medium',
    actionText: null,
    baseRule: 'Define specific instructions for how the AI should handle this content type.'
  }
} as const;

type RuleType = keyof typeof RULE_TYPES;

interface RuleData {
  type: RuleType;
  title: string;
  rule: string;
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}



interface InitialRuleData {
  id: string;
  type: RuleType;
  title: string;
  rule: string;
  priority: 'high' | 'medium' | 'low';
  temperature: number;
  languages: string[];
}

interface AddPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rule: RuleData) => void;
  isSubmitting?: boolean;
  initialData?: InitialRuleData; // For editing mode
  mode?: 'create' | 'edit';
}

export default function AddPromptDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  initialData,
  mode = 'create'
}: AddPromptDialogProps) {
  const [selectedType, setSelectedType] = useState<RuleType>('identify-and-mark');
  const [title, setTitle] = useState('');
  const [rule, setRule] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [error, setError] = useState('');

  const currentType = RULE_TYPES[selectedType];
  
  // Get subtle styling classes based on priority level
  const getInputStyling = () => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50/50 focus:border-red-300 focus:ring-red-100';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50/50 focus:border-yellow-300 focus:ring-yellow-100';
      case 'low':
        return 'border-green-200 bg-green-50/50 focus:border-green-300 focus:ring-green-100';
      default:
        return ''; // Fallback
    }
  };
  
  // Reset title when type changes (create mode only). In edit mode we preserve populated values.
  useEffect(() => {
    if (mode === 'create' && selectedType) {
      // Always clear the title when type changes (create only)
      setTitle('');
      // Auto-set priority based on rule type
      setPriority(currentType.priority as 'high' | 'medium' | 'low');
      // Clear rule when type changes to let user enter specific content
      setRule('');
      setError('');
    }
  }, [mode, selectedType, currentType]);

  // Simple title change handler - no prefix protection needed
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // Reset/populate form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        // Populate form with existing data
        setSelectedType(initialData.type);
        setTitle(initialData.title);
        setRule(initialData.rule);
        setPriority(initialData.priority);
        setError('');
      } else {
        // Reset form for create mode
        setSelectedType('identify-and-mark');
        setTitle('');
        setRule('');
        setPriority('high');
        setError('');
      }
    }
  }, [isOpen, mode, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const finalTitle = title.trim();
    const finalRule = rule.trim();
    
    // Validation
    if (!finalTitle) {
      setError('Title is required');
      return;
    }
    
    if (!finalRule) {
      setError('Rule description is required');
      return;
    }

    const ruleData: RuleData = {
      type: selectedType,
      title: finalTitle,
      rule: finalRule,
      priority,
      enabled: true
    };

    onConfirm(ruleData);
    
    // Reset form
    setSelectedType('identify-and-mark');
    setTitle('');
    setRule('');
    setPriority('high');
    setError('');
  };

  const handleClose = () => {
    setSelectedType('identify-and-mark');
    setTitle('');
    setRule('');
    setPriority('high');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit AI Rule' : 'AI Rules Management'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit' 
                ? 'Modify the AI processing rule settings and instructions.'
                : 'Create intelligent rules for automated document processing and content management.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-2">
            {/* Info alert with usage instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>Define how AI should process specific content types in your documents</div>
                  <ul className="list-outside list-disc text-sm text-muted-foreground pl-4">
                    <li>Choose the appropriate rule type and priority level</li>
                    <li>Provide a clear title and detailed processing instructions</li>
                    <li>Be specific about what content to target and how to handle it</li>
                    <li>Include examples and edge cases for better AI accuracy</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Error alert */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Priority Level */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority Level</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as any)} disabled={isSubmitting}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Critical for compliance</SelectItem>
                  <SelectItem value="medium">Important processing rule</SelectItem>
                  <SelectItem value="low">Helpful but not essential</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher priority rules are processed first
              </p>
            </div>

            {/* Rule Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rule Type</Label>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as RuleType)} disabled={isSubmitting}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RULE_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <p className="text-xs text-muted-foreground">
                {currentType.description}
              </p>
            </div>
            
            {/* Title with Action Text */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Rule Title <span className="text-destructive">*</span>
              </Label>
              
              {selectedType === 'custom' ? (
                <>
                  <Input
                    id="title"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Enter rule title..."
                    className="text-sm"
                    disabled={isSubmitting}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a descriptive title for your rule
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap mt-2">
                    {currentType.actionText}
                  </span>
                  <div className="flex-1">
                    <Input
                      id="title"
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="patient social security numbers"
                      className={cn("text-sm", getInputStyling())}
                      disabled={isSubmitting}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Specify what content to target (e.g., "patient social security numbers")
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Rule Description - larger textarea */}
            <div className="space-y-2">
              <Label htmlFor="rule" className="text-sm font-medium">
                Rule Instructions <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rule"
                value={rule}
                onChange={(e) => setRule(e.target.value)}
                placeholder={`Specify what content to target and how to identify it. For instance:\n${currentType.baseRule}`}
                className={cn("text-sm min-h-32 resize-none", getInputStyling())}
                rows={6}
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what content to target and how to handle it.
              </p>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !rule.trim() || isSubmitting}
            >
              {isSubmitting 
                ? (mode === 'edit' ? "Modifying..." : "Adding...") 
                : (mode === 'edit' ? "Modify Rule" : "Add Rule")
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
