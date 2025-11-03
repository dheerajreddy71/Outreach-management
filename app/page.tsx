import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check user role and team membership
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      teamMembers: {
        include: {
          team: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // If user is GUEST (no team), redirect to onboarding
  if (user.role === "GUEST" || user.teamMembers.length === 0) {
    redirect("/onboarding");
  }

  // Redirect to inbox (main dashboard)
  redirect("/inbox");
}
