import DocumentLayer from "./DocumentLayer";
import SelectionsLayer from "./SelectionsLayer";
import InfoLayer from "./InfoLayer";
import ActionsLayer from "./ActionsLayer";
import { type Document as DocumentType } from "@/types";
import { PDFProvider } from "@/context/PDFContext";

type Props = { document: DocumentType };

export default function Renderer({ document }: Props) {

  return (
    <div className="relative w-full h-full">
      <PDFProvider>
        <SelectionsLayer document={document} />
        <InfoLayer document={document} />
        <ActionsLayer />
        <DocumentLayer file={document.original_file} />
      </PDFProvider>
    </div>
  );
}
