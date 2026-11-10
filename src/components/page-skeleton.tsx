function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

export function PageSkeleton({
  label,
  variant = "page",
}: {
  label: string;
  variant?: "page" | "dashboard" | "patients" | "patient";
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="mb-6 flex items-center gap-3">
        <span className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>

      {variant === "dashboard" && (
        <>
          <Bar className="h-7 w-40" />
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card p-4">
                <Bar className="h-3 w-20" />
                <Bar className="mt-3 h-7 w-12" />
              </div>
            ))}
          </div>
          <div className="card mt-6 h-72 animate-pulse bg-slate-100" />
        </>
      )}

      {variant === "patients" && (
        <>
          <Bar className="h-7 w-36" />
          <div className="card mt-5 divide-y divide-slate-100 p-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3">
                <Bar className="size-9 rounded-full" />
                <Bar className="h-4 w-40" />
                <Bar className="ml-auto h-4 w-16" />
                <Bar className="h-4 w-20" />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === "patient" && (
        <>
          <Bar className="h-4 w-24" />
          <div className="mt-4 flex items-center gap-4">
            <Bar className="size-14 rounded-full" />
            <div>
              <Bar className="h-6 w-48" />
              <Bar className="mt-2 h-3 w-64" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="card p-4">
                <Bar className="h-3 w-20" />
                <Bar className="mt-3 h-7 w-16" />
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="card h-72 animate-pulse bg-slate-100 xl:col-span-2" />
            <div className="card h-72 animate-pulse bg-slate-100" />
          </div>
        </>
      )}

      {variant === "page" && (
        <>
          <Bar className="h-7 w-44" />
          <div className="card mt-5 h-64 animate-pulse bg-slate-100" />
        </>
      )}
    </div>
  );
}
