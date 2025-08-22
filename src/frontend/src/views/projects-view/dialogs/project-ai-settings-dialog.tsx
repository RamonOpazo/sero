"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const AiSettingsSchema = z.object({
  provider: z.string().min(1),
  model_name: z.string().min(1),
  temperature: z.number().min(0).max(1),
  top_p: z.number().min(0).max(1).nullable().optional(),
  max_tokens: z.coerce.number().int().min(1).nullable().optional(),
  num_ctx: z.coerce.number().int().min(1).nullable().optional(),
  seed: z.coerce.number().int().nullable().optional(),
  stop_tokens: z.string().optional(), // comma-separated
  system_prompt: z.string().optional(),
});

export type ProjectAiSettingsForm = z.infer<typeof AiSettingsSchema>;

interface ProjectAiSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectAiSettingsForm) => Promise<void>;
  initial?: Partial<ProjectAiSettingsForm>;
}

export function ProjectAiSettingsDialog({ isOpen, onClose, onSubmit, initial }: ProjectAiSettingsDialogProps) {
  const form = useForm<ProjectAiSettingsForm>({
    resolver: zodResolver(AiSettingsSchema),
    defaultValues: {
      provider: initial?.provider ?? "ollama",
      model_name: initial?.model_name ?? "llama3.1",
      temperature: initial?.temperature ?? 0.2,
      top_p: initial?.top_p ?? null,
      max_tokens: initial?.max_tokens ?? null,
      num_ctx: initial?.num_ctx ?? null,
      seed: initial?.seed ?? null,
      stop_tokens: initial?.stop_tokens ?? "",
      system_prompt: initial?.system_prompt ?? "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        provider: initial?.provider ?? "ollama",
        model_name: initial?.model_name ?? "llama3.1",
        temperature: initial?.temperature ?? 0.2,
        top_p: initial?.top_p ?? null,
        max_tokens: initial?.max_tokens ?? null,
        num_ctx: initial?.num_ctx ?? null,
        seed: initial?.seed ?? null,
        stop_tokens: initial?.stop_tokens ?? "",
        system_prompt: initial?.system_prompt ?? "",
      });
    }
  }, [isOpen, initial, form]);

  const handleSubmit = async (data: ProjectAiSettingsForm) => {
    const parsed = {
      ...data,
      stop_tokens: (data.stop_tokens || "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join(","),
    } as ProjectAiSettingsForm;
    await onSubmit(parsed);
  };

  const handleClose = () => {
    if (!form.formState.isSubmitting) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>AI Settings (Project)</DialogTitle>
          <DialogDescription>
            Configure default AI provider and parameters for this project. These settings will be used when applying AI to documents.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="ollama" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="llama3.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (0..1)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.05" min={0} max={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="top_p"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top P (0..1)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.05" min={0} max={1} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_tokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Tokens</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="num_ctx"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context Size</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="seed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seed</FormLabel>
                    <FormControl>
                      <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stop_tokens"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Stop Tokens (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ###, END" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="system_prompt"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Optional system prompt to guide the model" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={form.formState.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
