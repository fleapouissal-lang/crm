import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-[18px] animate-in fade-in duration-150">
      <div className="fl-card fl-pad space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid g-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="fl-card fl-pad space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="fl-card fl-pad space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
