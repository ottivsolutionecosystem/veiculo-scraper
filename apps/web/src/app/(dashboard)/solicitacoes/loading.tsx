import { Skeleton } from "@/components/ui/skeleton";

export default function SolicitacoesLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-64" />
      <div className="flex gap-4 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-64 shrink-0 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
