export default function DashboardLoading({
  variant = "section",
}: {
  variant?: "home" | "section" | "inline";
}) {
  if (variant === "inline") {
    return (
      <div role="status" aria-label="Loading" className="space-y-2">
        <span className="sr-only">Loading…</span>
        <div className="dashboard-skeleton-block h-3 w-2/3 rounded" />
        <div className="dashboard-skeleton-block h-3 w-1/2 rounded" />
      </div>
    );
  }

  return (
    <section
      role="status"
      aria-label={variant === "home" ? "Loading dashboard" : "Loading page"}
      aria-busy="true"
      className="space-y-4"
    >
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <div className="dashboard-skeleton-block h-5 w-44 rounded" />
        <div className="dashboard-skeleton-block h-3 w-64 max-w-full rounded" />
      </div>
      {variant === "home" ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="rounded-xl border border-[#e1e8f4] bg-white p-3"
              >
                <div className="dashboard-skeleton-block h-3 w-2/3 rounded" />
                <div className="dashboard-skeleton-block mt-3 h-5 w-4/5 rounded" />
                <div className="dashboard-skeleton-block mt-2 h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
            <div className="rounded-xl border border-[#e1e8f4] bg-white p-4">
              <div className="dashboard-skeleton-block h-4 w-40 rounded" />
              <div className="dashboard-skeleton-block mt-4 h-36 rounded-lg" />
            </div>
            <div className="rounded-xl border border-[#e1e8f4] bg-white p-4">
              <div className="dashboard-skeleton-block h-4 w-36 rounded" />
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="dashboard-skeleton-block mt-4 h-4 rounded"
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e1e8f4] bg-white p-4">
            <div className="dashboard-skeleton-block h-4 w-36 rounded" />
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="dashboard-skeleton-block mt-4 h-8 rounded-lg"
              />
            ))}
          </div>
          <div className="rounded-xl border border-[#e1e8f4] bg-white p-4">
            <div className="dashboard-skeleton-block h-4 w-44 rounded" />
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="dashboard-skeleton-block mt-4 h-8 rounded-lg"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
