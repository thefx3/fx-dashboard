import { Image, Paperclip, Video } from "lucide-react";

import { createPost } from "./actions";
import { ACTIVITY_OPTIONS } from "./types";
import type { SegmentRow } from "./types";
import {
  attachmentButtonClass,
  buttonPrimaryClass,
  cardClass,
  inputClass,
  inputNarrowClass,
  inputNarrowMutedClass,
  labelClass,
  textareaClass,
} from "./ui";

type PostComposerProps = {
  slug: string;
  segments: SegmentRow[];
  todayISO: string;
  todayLabel: string;
};

export default function PostComposer({
  slug,
  segments,
  todayISO,
  todayLabel,
}: PostComposerProps) {
  return (
    <form
      action={createPost}
      className={`${cardClass} p-2 space-y-3 border border-accent/70`}
    >
      <input type="hidden" name="slug" value={slug} />

      <div className="rounded-md p-1">
        <div className="grid">
          <textarea
            name="content"
            required
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
            <input
              type="text"
              readOnly
              value={todayLabel}
              className="border border-input rounded-md p-1 text-muted-foreground bg-muted"
            />
            <input type="hidden" name="happened_on" value={todayISO} />
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
            <label className={labelClass}>Durée</label>
            <input
              name="duration_hhmm"
              type="time"
              step={60}
              className="border border-input rounded-md p-1 bg-background text-muted-foreground"
              placeholder="00:30"
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

        <button className={buttonPrimaryClass}>Publier</button>
          
        </div>
      </div>
    </form>
  );
}
