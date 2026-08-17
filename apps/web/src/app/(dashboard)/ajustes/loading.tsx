import { Skeleton } from "@/components/ui/skeleton";

export default function AjustesLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-9 w-96" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
