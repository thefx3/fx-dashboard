import { redirect } from "next/navigation";

export default async function LearningTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  await params;
  redirect("/dashboard");
}
