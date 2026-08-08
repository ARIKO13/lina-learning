import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const today = new Date().toISOString().split('T')[0];
  const yearMonth = today.slice(0, 7);

  const [user, todayProgress, monthlyDaysResult] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.dailyProgress.findUnique({ where: { userId_date: { userId, date: today } } }),
    db.dailyProgress.count({ where: { userId, date: { startsWith: yearMonth } } }),
  ]);

  const monthlyDays = monthlyDaysResult;

  if (!user) {
    return NextResponse.json({
      id: userId,
      xp: 0, level: 1, streak: 0, currentSeason: 1,
      playedToday: false, monthlyDays: 0,
    });
  }

  return NextResponse.json({
    ...user,
    playedToday: !!todayProgress,
    monthlyDays,
  });
}
