import { Skeleton } from "@/components/ui/skeleton";

export default function RevisaoFipeLoading() {
  return (
    <div className="grid gap-3 p-6 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  );
}
