import { Skeleton } from "@/components/ui/skeleton";

export function DetailSkeleton() {
  return (
    <div className="grid gap-6 p-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}
