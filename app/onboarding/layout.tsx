import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is GUEST
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, teamMembers: { include: { team: true } } },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // If user is not GUEST and has team, redirect to inbox
  if (user.role !== "GUEST" && user.teamMembers.length > 0) {
    redirect("/inbox");
  }

  return <>{children}</>;
}
