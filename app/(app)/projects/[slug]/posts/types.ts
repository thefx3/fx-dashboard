export type ActivityType = "practice" | "reading" | "video" | "theory" | "test" | "other";

export type ActivityOption = {
  value: ActivityType;
  label: string;
};

export type SegmentRow = {
  id: string;
  name: string;
  slug: string;
};

export type PostRow = {
  id: string;
  title: string | null;
  content: string;
  activity_type: ActivityType;
  duration_minutes: number | null;
  happened_on: string;
  created_at: string;
  segment_id: string | null;
  project_segments?: { name: string | null } | null;
};

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  { value: "practice", label: "Practice" },
  { value: "reading", label: "Reading" },
  { value: "video", label: "Video" },
  { value: "theory", label: "Theory" },
  { value: "test", label: "Test" },
  { value: "other", label: "Other" },
];
