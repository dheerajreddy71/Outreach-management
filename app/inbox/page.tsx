import { InboxView } from "@/components/inbox/InboxView";

// This page uses dynamic features (auth, search params)
export const dynamic = 'force-dynamic';

export default function InboxPage() {
  return <InboxView />;
}
