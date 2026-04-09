import { redirect } from "next/navigation";

/** Legacy URL: topics now live under /round/1/… */
export default async function ReadAndSpeakSessionLegacyPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  if (topicId === "round") {
    redirect("/practice/production/read-and-speak");
  }
  redirect(`/practice/production/read-and-speak/round/1/${encodeURIComponent(topicId)}`);
}
