import { BarChart3, Database, LockKeyhole, type LucideIcon } from "lucide-react";

const bars = [42, 68, 54, 82, 62, 76, 58];

export default function HomePreview() {
  return (
    <div className="surface overflow-hidden p-5">
      <div className="flex items-center justify-between border-b border-site pb-4">
        <div>
          <p className="text-sm text-site-muted">Private workspace</p>
          <h2 className="mt-1 text-xl font-semibold">Dashboard preview</h2>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Live sync
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <PreviewMetric title="FTrader" value="Metrics" />
        <PreviewMetric title="FSystem" value="Health" />
        <PreviewMetric title="Learning" value="Progress" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="rounded-2xl border border-site bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Activity</span>
            <BarChart3 className="h-4 w-4 text-brand" aria-hidden="true" />
          </div>
          <div className="mt-8 flex h-32 items-end gap-2">
            {bars.map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-lg bg-brand"
                style={{ height: `${height}%`, opacity: 0.22 + index * 0.08 }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <PreviewStatus icon={Database} title="Data" />
          <PreviewStatus icon={LockKeyhole} title="Private" />
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-site bg-site p-4">
      <p className="text-sm text-site-muted">{title}</p>
      <p className="mt-3 font-semibold">{value}</p>
    </div>
  );
}

function PreviewStatus({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-site bg-white p-4">
      <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
      <p className="mt-5 font-semibold">{title}</p>
    </div>
  );
}
