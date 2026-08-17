import { Skeleton } from "@/components/ui/skeleton";

export default function DiscadorLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <Skeleton className="h-56 w-full rounded-lg" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
