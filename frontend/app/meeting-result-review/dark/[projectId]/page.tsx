import MeetingResultReviewScreen from "@/app/meeting-result-review/shared/MeetingResultReviewScreen";

export default async function DarkMeetingResultReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <MeetingResultReviewScreen mode="dark" projectId={projectId} />;
}
