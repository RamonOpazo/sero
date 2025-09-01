"use client"

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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface UploadDocumentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (uploadData: { files: FileList; template_description?: string }) => Promise<void>;
}

const formSchema = z.object({
  files: z.any().refine((files) => files && files.length > 0, 'At least one file is required'),
  description: z.string().optional(),
});

type FormData = {
  files: FileList;
  description?: string;
};

export function UploadDocumentsDialog({ isOpen, onClose, onSubmit }: UploadDocumentsDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  const onFormSubmit = async (data: FormData) => {
    try {
      const submitData = {
        files: data.files,
        template_description: data.description?.trim() || undefined,
      };
      
      await onSubmit(submitData);
      
      form.reset({
        description: '',
      });
      onClose();
    } catch (error) {
      console.error('Failed to upload documents:', error);
    }
  };

  const handleClose = () => {
    if (!form.formState.isSubmitting) {
      form.reset({
        description: '',
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Select PDF files to upload as documents. Provide a description template if needed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="files"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Files *</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={(e) => field.onChange(e.target.files)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description Template</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter document description template (optional)"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? 'Uploading...' : 'Upload Documents'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
