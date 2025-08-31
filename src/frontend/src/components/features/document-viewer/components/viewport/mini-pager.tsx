import { Button } from "@/components/ui/button";
import { Menubar } from "@/components/ui/menubar";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface MiniPagerProps {
  currentPage: number;
  numPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function MiniPager({ currentPage, numPages, onPrev, onNext }: MiniPagerProps) {
  const canPrev = currentPage > 0;
  const canNext = currentPage + 1 < numPages;

  return (
    <Menubar>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canPrev}
        onClick={onPrev}
        title="Previous page"
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm font-medium w-28 text-center">
        Page {Math.min(currentPage + 1, Math.max(numPages, 1))} of {Math.max(numPages, 1)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canNext}
        onClick={onNext}
        title="Next page"
      >
        <ChevronRight />
      </Button>
    </Menubar>
  );
}

