"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [providers, setProviders] = React.useState<{ name: string; models: string[] }[]>([]);
  const [loadingCatalog, setLoadingCatalog] = React.useState(false);
  const hasProviders = providers.length > 0;

  // Initialize form early so effects below can safely reference it
  const form = useForm<ProjectAiSettingsForm>({
    resolver: zodResolver(AiSettingsSchema) as any,
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
    } as any,
  }) as UseFormReturn<ProjectAiSettingsForm>;

  React.useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        setLoadingCatalog(true);
        const { AiAPI } = await import('@/lib/ai-api');
        const res = await AiAPI.catalog();
        if (res.ok) setProviders(Array.isArray(res.value.providers) ? res.value.providers : []);
        else setProviders([]);
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [isOpen]);

  // After catalog loads, default to a valid provider/model (prefer initial if valid)
  const defaultsAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isOpen) return;
    if (providers.length === 0) return;
    // Apply defaults exactly once per open (prefer initial values if they are valid)
    if (!defaultsAppliedRef.current) {
      const initialProvider = initial?.provider;
      const providerInCatalog = providers.find((p) => p.name === initialProvider);
      const chosenProvider = providerInCatalog ? providerInCatalog.name : providers[0].name;
      if (form.getValues('provider') !== chosenProvider) {
        form.setValue('provider', chosenProvider, { shouldDirty: false, shouldTouch: false });
      }

      const models = (providers.find((p) => p.name === chosenProvider)?.models) || [];
      const initialModel = initial?.model_name;
      const chosenModel = models.includes(initialModel || '') ? (initialModel as string) : (models[0] || '');
      if (chosenModel && form.getValues('model_name') !== chosenModel) {
        form.setValue('model_name', chosenModel, { shouldDirty: false, shouldTouch: false });
      }

      defaultsAppliedRef.current = true;
      return;
    }

    // Align to catalog if current provider/model are inconsistent
    const currentProvider = form.getValues('provider');
    const providerInCatalog = providers.find((p) => p.name === currentProvider);
    const chosenProvider = providerInCatalog ? providerInCatalog.name : providers[0].name;
    if (!providerInCatalog) {
      form.setValue('provider', chosenProvider, { shouldDirty: false, shouldTouch: false });
    }

    const models = (providers.find((p) => p.name === chosenProvider)?.models) || [];
    const currentModel = form.getValues('model_name');
    if (models.length > 0 && !models.includes(currentModel)) {
      form.setValue('model_name', models[0], { shouldDirty: false, shouldTouch: false });
    }
  }, [providers, isOpen, form, initial]);

  // Reset defaults-applied flag when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      defaultsAppliedRef.current = false;
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        provider: initial?.provider ?? "ollama",
        model_name: initial?.model_name ?? "llama3:latest",
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

  // When provider changes, ensure model aligns to available list
  const providerValue = form.watch('provider');
  React.useEffect(() => {
    if (!providerValue) return;
    const current = providers.find((p) => p.name === providerValue);
    if (!current) return;
    const models = current.models || [];
    const selectedModel = form.getValues('model_name');
    if (models.length > 0 && !models.includes(selectedModel)) {
      form.setValue('model_name', models[0], { shouldDirty: true, shouldTouch: true });
    }
  }, [providerValue, providers, form]);

  const currentProvider = providers.find((p) => p.name === providerValue);
  const hasModels = !!currentProvider && (currentProvider.models?.length ?? 0) > 0;

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
                    <FormLabel className="flex items-center gap-1">Provider
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>Use “ollama” to run models locally. Change only for custom providers.</TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!hasProviders}>
                        <SelectTrigger>
                          <SelectValue placeholder={hasProviders ? "Select provider" : (loadingCatalog ? "Loading providers..." : "No providers available")} />
                        </SelectTrigger>
                        <SelectContent>
                          {hasProviders && providers.map((p) => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormLabel className="flex items-center gap-1">Model
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>Installed model name in Ollama, e.g. llama3.1, mistral, qwen.</TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      {(() => {
                        const providerName = form.getValues('provider') || providerValue;
                        const current = providers.find((p) => p.name === providerName);
                        const models = current?.models || [];
                        return (
                          <Select value={field.value} onValueChange={field.onChange} disabled={!hasModels}>
                            <SelectTrigger>
                              <SelectValue placeholder={hasModels ? "Select model" : (loadingCatalog ? "Loading models..." : "No models available")} />
                            </SelectTrigger>
                            {hasModels && (
                              <SelectContent>
                                {models.map((m) => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            )}
                          </Select>
                        );
                      })()}
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
                    <FormLabel className="flex items-center gap-1">Temperature (0..1)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>Lower is more predictable (0.1–0.3 recommended for redaction).</TooltipContent>
                      </Tooltip>
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-1">Top P (0..1)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>Advanced sampling control. Leave blank unless required.</TooltipContent>
                      </Tooltip>
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-1">Max Tokens
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>Caps output length to keep responses concise and fast.</TooltipContent>
                      </Tooltip>
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-1">Context Size
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>How much text the model can consider at once (model-dependent).</TooltipContent>
                      </Tooltip>
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-1">Seed
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>Set to reproduce outputs. Leave blank for natural randomness.</TooltipContent>
                      </Tooltip>
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-1">Stop Tokens (comma-separated)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>Response ends when any token matches. Optional.</TooltipContent>
                      </Tooltip>
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-1">System Prompt
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] cursor-default select-none">?</span>
                        </TooltipTrigger>
                        <TooltipContent>High‑level guidance for the AI. Keep it concise.</TooltipContent>
                      </Tooltip>
                    </FormLabel>
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
              <Button type="submit" disabled={form.formState.isSubmitting || !hasProviders || !hasModels}>
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
