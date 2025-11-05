export function ProblemCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-6 w-2/3 bg-white/10 rounded" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full bg-white/5 rounded" />
            <div className="h-4 w-5/6 bg-white/5 rounded" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 bg-white/5 rounded-full" />
            <div className="h-6 w-16 bg-white/5 rounded-full" />
            <div className="h-6 w-20 bg-white/5 rounded-full" />
          </div>
        </div>
        <div className="ml-4 h-10 w-28 bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex justify-start animate-pulse">
      <div className="max-w-[80%] rounded-2xl border border-white/5 bg-surface p-4">
        <div className="space-y-2">
          <div className="h-4 w-64 bg-white/10 rounded" />
          <div className="h-4 w-48 bg-white/10 rounded" />
          <div className="h-4 w-56 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

export function DashboardStatSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-6 animate-pulse">
      <div className="h-4 w-24 bg-white/10 rounded" />
      <div className="mt-2 h-8 w-16 bg-white/10 rounded" />
    </div>
  );
}

export function SessionCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-4 animate-pulse flex items-center justify-between">
      <div className="flex-1">
        <div className="h-5 w-48 bg-white/10 rounded" />
        <div className="mt-2 h-4 w-32 bg-white/5 rounded" />
      </div>
      <div className="h-9 w-20 bg-white/5 rounded-lg" />
    </div>
  );
}

