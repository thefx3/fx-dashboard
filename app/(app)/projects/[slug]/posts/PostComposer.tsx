import { Image, Paperclip, Video } from "lucide-react";

import { createPost } from "./actions";
import { DateField, TimeField } from "./DataFields";
import { ACTIVITY_OPTIONS } from "./types";
import type { SegmentRow } from "./types";
import {
  attachmentButtonClass,
  buttonPrimaryClass,
  cardClass,
  labelClass,
  textareaClass,
} from "./ui";

type PostComposerProps = {
  slug: string;
  segments: SegmentRow[];
  todayISO: string;
};

export default function PostComposer({
  slug,
  segments,
  todayISO,
}: PostComposerProps) {
  return (
    <form
      action={createPost}
      className={`${cardClass} p-2 space-y-3 border border-primary`}
    >
      <input type="hidden" name="slug" value={slug} />

      <div className="rounded-md p-1">
        <div className="grid">
        <textarea
          name="content"
          className={textareaClass}
          placeholder="Today..."
        />
        </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center">
          <label className={attachmentButtonClass}>
            <Paperclip className="h-4 w-4" />
            <input type="file" name="attachment_file" className="sr-only" />
          </label>

          <label className={attachmentButtonClass}>
            <Image className="h-4 w-4" />
            <input
              type="file"
              name="attachment_photos"
              accept="image/*"
              multiple
              className="sr-only"
            />
          </label>

          <label className={attachmentButtonClass}>
            <Video className="h-4 w-4" />
            <input
              type="file"
              name="attachment_videos"
              accept="video/*"
              multiple
              className="sr-only"
            />
          </label>

          <div className={attachmentButtonClass}>
            <DateField
              name="happened_on"
              defaultValue={todayISO}
              className="border border-input rounded-md p-1 text-muted-foreground bg-background"
            />
          </div>

          <div className={attachmentButtonClass}>
            <TimeField
              name="happened_time"
              className="border border-input rounded-md p-1 text-muted-foreground bg-background"
            />
          </div>

          <div className={attachmentButtonClass}>
            <label className={labelClass}>Type</label>
            <select name="activity_type" defaultValue="other" className="border border-input rounded-md p-1 bg-background text-muted-foreground">
              {ACTIVITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={attachmentButtonClass}>
            <label className={labelClass}>Duration</label>
            <TimeField
              name="duration_hhmm"
              step={60}
              className="border border-input rounded-md p-1 bg-background text-muted-foreground"
            />
          </div>

        <div className={attachmentButtonClass}>
          <label className={labelClass}>Segment</label>
          <input
            name="segment_name"
            list="segment-options"
            className="border border-input rounded-md p-1 bg-background text-muted-foreground"
            placeholder="Ex: Gammes"
          />
          <datalist id="segment-options">
            {segments.map((segment) => (
              <option key={segment.id} value={segment.name} />
            ))}
          </datalist>
        </div>


        </div>

        <div className="flex flex-wrap items-center">

        </div>

        <button className={buttonPrimaryClass}>Share</button>
          
        </div>
      </div>
    </form>
  );
}
