// src/app/(dashboard)/bets/[categoryId]/loading.tsx
export default function LoadingCategory() {
    return (
      <div className="space-y-4">
      <div className="h-6 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[340px] bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }