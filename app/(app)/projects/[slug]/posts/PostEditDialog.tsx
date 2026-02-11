"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { updatePost } from "./actions";
import { ACTIVITY_OPTIONS } from "./types";
import type { PostRow, SegmentRow } from "./types";
import { DateField, TimeField } from "./DataFields";
import { buttonPrimaryClass, inputClass, labelClass, textareaClass } from "./ui";

type PostEditDialogProps = {
  slug: string;
  post: PostRow;
  segments: SegmentRow[];
};

function getDateTimeParts(happenedOn: string) {
  const [datePart, timePart] = happenedOn.split("T");
  let timeValue = "";

  if (timePart) {
    const hhmm = timePart.slice(0, 5);
    const [hh, mm] = hhmm.split(":").map((part) => Number(part));
    if (Number.isFinite(hh) && Number.isFinite(mm) && !(hh === 0 && mm === 0)) {
      timeValue = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  return { dateValue: datePart, timeValue };
}

function formatDurationHhmm(durationMinutes: number | null) {
  if (durationMinutes == null) return "";
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function PostEditDialog({ slug, post, segments }: PostEditDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const { dateValue, timeValue } = useMemo(
    () => getDateTimeParts(post.happened_on),
    [post.happened_on]
  );
  const durationValue = useMemo(
    () => formatDurationHhmm(post.duration_minutes),
    [post.duration_minutes]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-accent cursor-pointer hover:scale-110 transition"
        aria-label="Edit post"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[220]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onPointerDown={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute left-1/2 top-1/2 w-[94%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-5 shadow-2xl"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-widerfont-semibold">Edit post</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground transition hover:text-accent"
              >
                Close
              </button>
            </div>

            <form
              action={updatePost}
              onSubmit={() => setOpen(false)}
              className="mt-4 space-y-3"
            >
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="post_id" value={post.id} />

              <textarea
                name="content"
                defaultValue={post.content}
                className={`${textareaClass} w-full border border-input bg-background text-sm`}
                placeholder="Votre post..."
              />

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className={labelClass}>Date</label>
                  <DateField
                    key={`${post.id}-date`}
                    name="happened_on"
                    defaultValue={dateValue}
                    className="rounded-md border border-input bg-background p-1 text-sm text-muted-foreground"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className={labelClass}>Heure</label>
                  <TimeField
                    key={`${post.id}-time`}
                    name="happened_time"
                    defaultValue={timeValue}
                    className="rounded-md border border-input bg-background p-1 text-sm text-muted-foreground"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className={labelClass}>Type</label>
                  <select
                    name="activity_type"
                    defaultValue={post.activity_type}
                    className="rounded-md border border-input bg-background p-1 text-sm text-muted-foreground"
                  >
                    {ACTIVITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className={labelClass}>Duration</label>
                  <TimeField
                    key={`${post.id}-duration`}
                    name="duration_hhmm"
                    step={60}
                    defaultValue={durationValue}
                    className="rounded-md border border-input bg-background p-1 text-sm text-muted-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-start items-center gap-3">
                  <label className={labelClass}>Segment</label>
                  <input
                    name="segment_name"
                    list={`segment-options-${post.id}`}
                    defaultValue={post.project_segments?.name ?? ""}
                    placeholder="Ex: Gammes"
                    className={`${inputClass} h-9 w-full text-sm text-muted-foreground`}
                  />
                  <datalist id={`segment-options-${post.id}`}>
                    {segments.map((segment) => (
                      <option key={segment.id} value={segment.name} />
                    ))}
                  </datalist>

              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-md border border-input px-3 text-xs text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                >
                  Cancel
                </button>
                <button type="submit" className={`${buttonPrimaryClass} h-9`}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
