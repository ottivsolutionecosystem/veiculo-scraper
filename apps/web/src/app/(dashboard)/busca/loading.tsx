import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function BuscaLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <ListSkeleton rows={6} />
    </div>
  );
}
