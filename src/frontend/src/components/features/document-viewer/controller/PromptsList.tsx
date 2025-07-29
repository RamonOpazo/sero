import { type Prompt } from "@/types";
import { Button } from "@/components/ui/button";

type Props = { prompts: Prompt[] };

export default function PromptList({ prompts }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Prompts</h3>
        <Button variant="destructive" size="sm">Clear All</Button>
      </div>
      <div className="space-y-2">
        {prompts.map(prompt => (
          <div key={prompt.id} className="flex justify-between items-center p-1 bg-gray-100 rounded">
            <div className="truncate text-sm">{prompt.text}</div>
            <Button size="icon" variant="outline">X</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
