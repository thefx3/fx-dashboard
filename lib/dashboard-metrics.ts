import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DashboardMetric = {
  id: string;
  app: "ftrader" | "fsystem" | "fx_dashboard";
  label: string;
  value: string;
  unit?: string | null;
  trend?: string | null;
};

type MetricRow = {
  id: string;
  app: string | null;
  metric_label: string | null;
  metric_value: string | number | null;
  unit: string | null;
  trend: string | null;
};

const fallbackMetrics: DashboardMetric[] = [
  {
    id: "ftrader-placeholder",
    app: "ftrader",
    label: "FTrader performance",
    value: "0",
    unit: "rows",
    trend: "Waiting for live metrics",
  },
  {
    id: "fsystem-placeholder",
    app: "fsystem",
    label: "FSystem health",
    value: "0",
    unit: "rows",
    trend: "Waiting for live metrics",
  },
  {
    id: "fx-dashboard-placeholder",
    app: "fx_dashboard",
    label: "Dashboard activity",
    value: "0",
    unit: "rows",
    trend: "Waiting for live metrics",
  },
];

export async function getDashboardMetrics() {
  const supabase = await createClient();
  let data: MetricRow[] | null = null;
  let hasError = false;

  try {
    const result = await supabase
      .from("app_metrics")
      .select("id,app,metric_label,metric_value,unit,trend")
      .in("app", ["ftrader", "fsystem", "fx_dashboard"])
      .limit(8)
      .returns<MetricRow[]>();
    data = result.data;
    hasError = Boolean(result.error);
  } catch {
    hasError = true;
  }

  if (hasError || !data?.length) {
    return { metrics: fallbackMetrics, isLive: false };
  }

  return {
    metrics: data
      .filter(
        (row) =>
          row.app === "ftrader" ||
          row.app === "fsystem" ||
          row.app === "fx_dashboard",
      )
      .map((row) => ({
        id: row.id,
        app: row.app as DashboardMetric["app"],
        label: row.metric_label ?? "Metric",
        value: row.metric_value == null ? "-" : String(row.metric_value),
        unit: row.unit,
        trend: row.trend,
      })),
    isLive: true,
  };
}
