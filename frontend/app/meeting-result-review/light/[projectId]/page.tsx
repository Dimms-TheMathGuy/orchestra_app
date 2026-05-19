import MeetingResultReviewScreen from "@/app/meeting-result-review/shared/MeetingResultReviewScreen";

export default async function LightMeetingResultReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <MeetingResultReviewScreen mode="light" projectId={projectId} />;
}
