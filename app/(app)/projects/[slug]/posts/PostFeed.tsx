import { deletePost } from "./actions";
import type { PostRow } from "./types";
import {
  badgeClass,
  buttonDestructiveClass,
  cardClass,
  pillClass,
  subtleTextClass,
  tagTextClass,
} from "./ui";

type PostFeedProps = {
  slug: string;
  posts: PostRow[];
};

export default function PostFeed({ slug, posts }: PostFeedProps) {
  if (posts.length === 0) {
    return (
      <div className={`${cardClass} p-6 ${subtleTextClass}`}>Aucun post pour le moment.</div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <article key={post.id} className={`${cardClass} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold truncate">{post.title ?? "Sans titre"}</h2>
                <span className={badgeClass}>{post.happened_on}</span>
                {post.duration_minutes != null && (
                  <span className={pillClass}>{post.duration_minutes} min</span>
                )}
                {post.project_segments?.name && (
                  <span className={pillClass}>{post.project_segments.name}</span>
                )}
                <span className={tagTextClass}>{post.activity_type}</span>
              </div>

              <p className="mt-2 text-sm whitespace-pre-wrap">{post.content}</p>
            </div>

            <form action={deletePost} className="shrink-0">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="post_id" value={post.id} />
              <button className={buttonDestructiveClass}>Supprimer</button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
