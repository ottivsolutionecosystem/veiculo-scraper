import { Skeleton } from "@/components/ui/skeleton";

export default function FontesLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-40" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
