import { Bookmark, Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { deletePost } from "./actions";
import type { PostRow } from "./types";
import { cardClass, pillClass, subtleTextClass, tagTextClass } from "./ui";

type PostFeedProps = {
  slug: string;
  posts: PostRow[];
};

  function capitalizeFirstLetter(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function formatPostDate(happenedOn: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [datePart, timePart] = happenedOn.split("T");
    const [y, m, d] = datePart.split("-").map((part) => Number(part));
    const dateOnly = new Date(y, (m ?? 1) - 1, d ?? 1);

    let timeLabel: string | null = null;
    if (timePart) {
      const hhmm = timePart.slice(0, 5);
      const [hh, mm] = hhmm.split(":").map((part) => Number(part));
      if (Number.isFinite(hh) && Number.isFinite(mm) && !(hh === 0 && mm === 0)) {
        const hours = String(hh).padStart(2, "0");
        const minutes = String(mm).padStart(2, "0");
        timeLabel = `${hours}:${minutes}`;
      }
    }

    const diffDays = Math.round((dateOnly.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return timeLabel ? `Today at ${timeLabel}` : "Today";
    if (diffDays === -1) return timeLabel ? `Yesterday at ${timeLabel}` : "Yesterday";
    if (diffDays === 1) return timeLabel ? `Tomorrow at ${timeLabel}` : "Tomorrow";

    const months = [
      "Jan.",
      "Feb.",
      "Mar.",
      "Apr.",
      "May",
      "Jun.",
      "Jul.",
      "Aug.",
      "Sep.",
      "Oct.",
      "Nov.",
      "Dec.",
    ];
    const day = dateOnly.getDate();
    const month = months[dateOnly.getMonth()];
    const year = dateOnly.getFullYear();
    return timeLabel ? `${day} ${month} ${year}, ${timeLabel}` : `${day} ${month} ${year}`;
  }

export default function PostFeed({ slug, posts }: PostFeedProps) {
  if (posts.length === 0) {
    return (
      <div className={`${cardClass} p-6 ${subtleTextClass}`}>Aucun post pour le moment.</div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <article key={post.id} className={`${cardClass} border border-ring p-5`}>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold">Francois Xavier Pairault</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPostDate(post.happened_on)}
                    </p>
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground" type="button">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {post.project_segments?.name && (
                  <span className={pillClass}> {capitalizeFirstLetter(post.project_segments.name)}
                  </span>
                )}
                <span className={pillClass}>{capitalizeFirstLetter(post.activity_type)}</span>
                {post.duration_minutes != null && (
                  <span className={pillClass}>{post.duration_minutes} min</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-4">
                  <button className="inline-flex items-center gap-2 hover:text-foreground cursor-pointer" type="button">
                    <Heart className="h-4 w-4" />
                    Like
                  </button>
                  <button className="inline-flex items-center gap-2 hover:text-foreground cursor-pointer" type="button">
                    <MessageCircle className="h-4 w-4" />
                    Comment
                  </button>
                  <button className="inline-flex items-center gap-2 hover:text-foreground cursor-pointer" type="button">
                    <Bookmark className="h-4 w-4" />
                    Save
                  </button>
                  <button className="inline-flex items-center gap-2 hover:text-foreground cursor-pointer" type="button">
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>

                <form action={deletePost} className="ml-auto">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="post_id" value={post.id} />
                  <button className="text-xs hover:text-primary cursor-pointer">Delete</button>
                </form>
              </div>
            </div>

          </div>
        </article>
      ))}
    </div>
  );
}
