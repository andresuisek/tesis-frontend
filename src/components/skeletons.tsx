import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Dashboard-style stat card (icon circle + value + change line)     */
/* ------------------------------------------------------------------ */
export function SkeletonStatCard() {
  return (
    <Card>
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-3 w-36" />
      </CardHeader>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple stat card (CardHeader row + CardContent value)             */
/*  Used by: Retenciones, Notas Crédito, Clientes                    */
/* ------------------------------------------------------------------ */
export function SkeletonStatCardSimple() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-24 mb-1" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Table rows placeholder                                            */
/* ------------------------------------------------------------------ */
interface SkeletonTableRowsProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTableRows({
  rows = 5,
  columns = 6,
}: SkeletonTableRowsProps) {
  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="flex gap-4 border-b p-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b p-3 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={`${r}-${c}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart card placeholder                                            */
/* ------------------------------------------------------------------ */
export function SkeletonChartCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-72 w-full" />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Client card placeholder (Clientes module)                         */
/* ------------------------------------------------------------------ */
export function SkeletonClientCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-3 w-28 font-mono" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
