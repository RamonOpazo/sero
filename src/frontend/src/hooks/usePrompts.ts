import { useState } from "react";
import { type PromptType as PromptType } from "@/types";

export function usePrompts(initialPrompts: PromptType[] = []) {
  const [prompts, setPrompts] = useState(initialPrompts);

  const addPrompt = (prompt: PromptType) => setPrompts(prev => [...prev, prompt]);
  const deletePrompt = (id: string) => setPrompts(prev => prev.filter(p => p.id !== id));
  const clearPrompts = () => setPrompts([]);

  return {
    prompts,
    addPrompt,
    deletePrompt,
    clearPrompts,
  };
}
