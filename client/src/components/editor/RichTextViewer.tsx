import { cn } from "@/lib/utils";

interface RichTextViewerProps {
  content: string;
  className?: string;
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-foreground",
        "[&_a]:text-primary [&_a]:underline",
        "[&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:list-decimal [&_ol]:pl-5",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
