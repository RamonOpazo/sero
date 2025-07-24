"use client"

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmationText: string;
  confirmButtonText?: string;
  variant?: 'destructive' | 'default';
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmationText,
  confirmButtonText = 'Confirm',
  variant = 'destructive',
}: ConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create schema that validates against the required confirmation text
  const confirmSchema = z.object({
    confirmation: z.string().refine(
      (val) => val.toLowerCase() === confirmationText.toLowerCase(),
      { message: `You must type "${confirmationText}" to confirm` }
    ),
  });

  type ConfirmFormData = z.infer<typeof confirmSchema>;

  const form = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: {
      confirmation: '',
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleConfirm = async (data: ConfirmFormData) => {
    if (data.confirmation.toLowerCase() !== confirmationText.toLowerCase()) return;

    setIsSubmitting(true);
    try {
      await onConfirm();
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error during confirmation action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  const currentValue = form.watch('confirmation');
  const isConfirmationMatch = currentValue?.toLowerCase() === confirmationText.toLowerCase();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : 'text-warning'}`} />
            <DialogTitle className={variant === 'destructive' ? 'text-destructive' : ''}>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {description}
            <br />
            <br />
            To confirm, please type{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{confirmationText}</code>{' '}
            in the field below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type "{confirmationText}" to confirm</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={confirmationText}
                      {...field}
                      disabled={isSubmitting}
                      autoComplete="off"
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
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
                variant={variant}
                disabled={isSubmitting || !isConfirmationMatch}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Processing...' : confirmButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
