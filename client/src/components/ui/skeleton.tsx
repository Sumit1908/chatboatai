import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[#075E54]/[0.06]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

function PageSkeleton({ title = true, subtitle = true, children }: { title?: boolean; subtitle?: boolean; children?: React.ReactNode }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {(title || subtitle) && (
        <div className="page-hero">
          {title && <Skeleton className="h-7 w-40" />}
          {subtitle && <Skeleton className="h-4 w-64 mt-2.5" />}
        </div>
      )}
      {children}
    </div>
  )
}

function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/60 bg-white/80 p-6 space-y-4", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-5 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 pb-2 border-b border-[#075E54]/6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" style={{ maxWidth: `${60 + Math.random() * 80}px` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className="h-8"
              style={{
                flex: col === 0 ? 2 : 1,
                opacity: 1 - row * 0.08,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function KPIGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-3", count <= 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 md:grid-cols-5")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/60 bg-white/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-2 w-12" />
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className={cn(height, "relative flex items-end gap-1 pt-8")}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${20 + Math.sin(i * 0.8) * 30 + Math.random() * 30}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export { Skeleton, PageSkeleton, CardSkeleton, TableSkeleton, KPIGridSkeleton, ChartSkeleton }
