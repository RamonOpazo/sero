import { type SelectionType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, X } from "lucide-react";

type Props = { selections: SelectionType[] };

export default function SelectionList({ selections }: Props) {
  return (
    <Accordion
      type="single"
      collapsible
      className="flex flex-col gap-2 w-full h-full overflow-hidden"
    // defaultValue="item-1"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger className="text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md text-xs font-medium">Selections</AccordionTrigger>
        <div className="grid grid-cols-2 justify-between items-center gap-2 py-2">
          <Button variant="outline" size="sm">
            <Save /> Save
          </Button>
          <Button variant="destructive" size="sm">
            Clear All
          </Button>
        </div>
        <AccordionContent>
          <ScrollArea className="h-[200px] border rounded-md">
            <div className="flex flex-col justify-between gap-border items-center">
              {selections.map(sel => (
                <div key={sel.id} className="flex flex-row w-full hover:bg-muted/50 justify-start items-center">
                  <span className="text-xs text-sidebar-foreground/70 pl-2">
                    [p: {sel.page_number}] @ (x={sel.x}, y={sel.y}) {sel.is_ai_generated && `- conf: ${sel.confidence}`}
                  </span>
                  <Button size="icon" variant="ghost" className="ml-auto"><X size={5} /></Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
