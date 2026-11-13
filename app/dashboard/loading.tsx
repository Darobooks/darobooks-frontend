import DashboardLoading from "./DashboardLoading";

export default function Loading() {
  return (
    <main
      role="status"
      aria-label="Loading dashboard page"
      aria-busy="true"
      className="dashboard-shell flex min-h-screen bg-[#f1f5fd] font-jakarta text-[#10213c]"
    >
      <span className="sr-only">Loading dashboard page…</span>
      <aside
        aria-hidden="true"
        className="hidden w-[248px] shrink-0 border-r border-[#e1e8f4] bg-white p-4 lg:block"
      >
        <div className="flex h-[42px] items-center border-b border-[#e8edf5] pb-3">
          <div className="dashboard-skeleton-block h-7 w-32 rounded" />
        </div>
        <div className="mt-5 space-y-5">
          {Array.from({ length: 5 }, (_, group) => (
            <div key={group} className="space-y-3">
              <div className="dashboard-skeleton-block h-2.5 w-16 rounded" />
              {Array.from({ length: group === 0 ? 4 : 2 }, (_, item) => (
                <div key={item} className="flex items-center gap-2 px-1">
                  <div className="dashboard-skeleton-block h-4 w-4 rounded" />
                  <div
                    className={`dashboard-skeleton-block h-3 rounded ${
                      item % 2 === 0 ? "w-28" : "w-20"
                    }`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header
          aria-hidden="true"
          className="flex h-[58px] items-center justify-between border-b border-[#e1e8f4] bg-white px-3 sm:px-5"
        >
          <div className="dashboard-skeleton-block h-8 w-40 rounded-md" />
          <div className="flex items-center gap-2">
            <div className="dashboard-skeleton-block h-8 w-8 rounded-full" />
            <div className="dashboard-skeleton-block h-8 w-8 rounded-full" />
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5 sm:py-5 xl:px-6">
          <DashboardLoading />
        </div>
      </div>
    </main>
  );
}
