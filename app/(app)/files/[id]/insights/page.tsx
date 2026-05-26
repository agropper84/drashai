import { redirect } from 'next/navigation';
export default function InsightsRedirect({ params }: { params: Promise<{ id: string }> }) {
  // Insights folded into Conversation (Plan 11)
  return redirect('../conversation');
}
