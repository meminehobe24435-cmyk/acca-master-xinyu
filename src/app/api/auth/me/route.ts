import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      examDate: true,
      dailyGoal: true,
      streakCount: true,
      totalStudyMinutes: true,
    },
  });
  return NextResponse.json({ user });
}
