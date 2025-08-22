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
import type { ProjectCreateType } from '@/types';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: ProjectCreateType) => Promise<void>;
}

// Simple form schema that matches what we need
const formSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  contact_name: z.string().min(1, 'Contact name is required').max(100, 'Contact name must be less than 100 characters'),
  contact_email: z.string().min(1, 'Contact email is required').max(100, 'Contact email must be less than 100 characters').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

type ProjectFormData = z.infer<typeof formSchema>;

export function CreateProjectDialog({ isOpen, onClose, onSubmit }: CreateProjectDialogProps) {
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      contact_name: '',
      contact_email: '',
      password: '',
    },
  });

  const onFormSubmit = async (data: ProjectFormData) => {
    try {
      // Clean up the data before submitting
      const submitData: ProjectCreateType = {
        name: data.name.trim(),
        contact_name: data.contact_name.trim(),
        contact_email: data.contact_email.trim(),
        password: data.password,
      };
      
      // Only include description if it has content
      if (data.description?.trim()) {
        submitData.description = data.description.trim();
      }
      
      await onSubmit(submitData);
      
      // Reset form and close dialog on success
      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      // Error is handled in the parent component and re-thrown
      // Form stays open so user can correct and retry
    }
  };

  const handleClose = () => {
    if (!form.formState.isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new project. All fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter project description (optional)" 
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
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter contact email" {...field} />
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
                  <FormLabel>Project Password *</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter password (min. 8 characters)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground mt-1">
                    This password will be used to encrypt and protect project documents.
                  </div>
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
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
