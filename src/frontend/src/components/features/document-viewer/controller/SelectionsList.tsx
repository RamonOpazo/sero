import { type Selection } from "@/types";
import { Button } from "@/components/ui/button";

type Props = { selections: Selection[] };

export default function SelectionList({ selections }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Selections</h3>
        <Button variant="destructive" size="sm">Clear All</Button>
      </div>
      <div className="space-y-2">
        {selections.map(sel => (
          <div key={sel.id} className="flex justify-between items-center p-1 bg-gray-100 rounded">
            <div>Page: {sel.page_number ?? "-"}</div>
            <Button size="icon" variant="outline">X</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
