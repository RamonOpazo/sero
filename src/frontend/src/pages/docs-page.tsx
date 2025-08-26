import { ScrollArea } from '@/components/ui/scroll-area'
import { DocumentationView } from '@/views';

interface DocsPageProps {
  docName?: string
}

export function DocsPage({ docName }: DocsPageProps) {

  return (
    <div className="relative py-[2rem] px-[3rem]">
      <ScrollArea>
        <div className="max-w-[85ch] flex flex-col gap-2">
          <DocumentationView docName={docName} />
        </div>
      </ScrollArea>
    </div>
  );
}
