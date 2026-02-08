import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

import PostComposer from "./PostComposer";
import PostFeed from "./PostFeed";
import type { PostRow, SegmentRow } from "./types";
import PostNews from "./PostNews";

export default async function ProjectPostsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id,name,slug")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .single();

  if (projErr || !project) notFound();

  const { data: segments } = await supabase
    .from("project_segments")
    .select("id,name,slug")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true })
    .returns<SegmentRow[]>();

  const { data: posts, error: postsErr } = await supabase
    .from("project_posts")
    .select(
      "id,title,content,activity_type,duration_minutes,happened_on,created_at,segment_id,project_segments(name)"
    )
    .eq("project_id", project.id)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<PostRow[]>();

  if (postsErr) throw postsErr;

  return (
    <div className="py-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_250px] md:items-start">
      <div className="space-y-6">
        <PostComposer
            slug={slug}
            segments={segments ?? []}
            todayISO={todayISO}
        />
        <PostFeed slug={slug} posts={posts ?? []} />
      </div>

      <PostNews />
    </div>
  );
}
