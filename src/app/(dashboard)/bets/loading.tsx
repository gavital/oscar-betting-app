// src/app/(dashboard)/bets/loading.tsx
export default function LoadingBets() {
    return (
      <div className="space-y-2">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-2 w-full bg-gray-200 rounded animate-pulse" />
        <div className="space-y-2 mt-4">
          <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }