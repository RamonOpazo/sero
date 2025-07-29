import { Button } from "@/components/ui/button";

export default function ControllerButtons() {
  return (
    <div className="flex felx-1 flex-col gap-2">
      <Button>Process Selections</Button>
      <Button>Switch to Processed</Button>
      <Button>Back to Original</Button>
      <Button variant="destructive">Delete File</Button>
      <Button>Save Selections</Button>
      <Button>Save Prompts</Button>
    </div>
  );
}
