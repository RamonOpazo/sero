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
import type { DocumentUpload } from '@/types';

interface CreateDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (uploadData: DocumentUpload) => Promise<void>;
  projectId: string;
}

const formSchema = z.object({
  files: z.any().refine((files) => files && files.length > 0, 'At least one file is required'),
  description: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

type FormData = {
  files: FileList;
  description?: string;
  password: string;
};

export function CreateDocumentDialog({ isOpen, onClose, onSubmit, projectId }: CreateDocumentDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      password: '',
    },
  });

  const onFormSubmit = async (data: FormData) => {
    try {
      const submitData: DocumentUpload = {
        project_id: projectId,
        files: data.files,
        password: data.password.trim(),
      };
      
      if (data.description?.trim()) {
        submitData.description = data.description.trim();
      }
      
      await onSubmit(submitData);
      
      form.reset({
        description: '',
        password: '',
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
        password: '',
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter password" {...field} />
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
