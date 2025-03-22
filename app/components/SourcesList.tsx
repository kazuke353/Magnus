import SourceItem from "~/components/SourceItem";

interface Source {
  title: string;
  url: string;
  content?: string;
}

interface SourcesListProps {
  sources: Source[];
}

export default function SourcesList({ sources }: SourcesListProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 mb-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Sources ({sources.length})
      </h3>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <SourceItem key={index} source={source} index={index} />
        ))}
      </div>
    </div>
  );
}
