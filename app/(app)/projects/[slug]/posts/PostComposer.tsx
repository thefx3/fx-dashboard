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
      encType="multipart/form-data"
      className={`${cardClass} p-4 space-y-3`}
    >
      <input type="hidden" name="slug" value={slug} />

      <div className="flex flex-wrap items-start gap-2">
        <div className="grid gap-2">
          <label className={labelClass}>Date</label>
          <input
            type="date"
            name="happened_on"
            value={todayISO}
            className={inputClass}
          />
          <input type="hidden" name="happened_on" value={todayISO} />
        </div>

        <div className="grid gap-2">
          <label className={labelClass}>Type</label>
          <select name="activity_type" defaultValue="other" className={inputNarrowClass}>
            {ACTIVITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className={labelClass}>Durée</label>
          <input
            name="duration_hhmm"
            type="time"
            step={60}
            className={inputNarrowClass}
            placeholder="00:30"
          />
        </div>

        <div className="grid gap-2">
          <label className={labelClass}>Segment</label>
          <input
            name="segment_name"
            list="segment-options"
            className={inputNarrowClass}
            placeholder="Ex: Gammes"
          />
          <datalist id="segment-options">
            {segments.map((segment) => (
              <option key={segment.id} value={segment.name} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-2">
        <textarea
          name="content"
          required
          className={textareaClass}
          placeholder="Today..."
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className={attachmentButtonClass}>
            <Paperclip className="h-4 w-4" />
            Fichier
            <input type="file" name="attachment_file" className="sr-only" />
          </label>

          <label className={attachmentButtonClass}>
            <Image className="h-4 w-4" />
            Photos
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
            Vidéos
            <input
              type="file"
              name="attachment_videos"
              accept="video/*"
              multiple
              className="sr-only"
            />
          </label>
        </div>

        <button className={buttonPrimaryClass}>Publier</button>
      </div>
    </form>
  );
}
