import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Username minimal 2 karakter' }, { status: 400 });
    }
    if (name.trim().length > 30) {
      return NextResponse.json({ error: 'Username maksimal 30 karakter' }, { status: 400 });
    }

    const trimmed = name.trim();
    await db.user.update({
      where: { id: session.user.id },
      data: { name: trimmed },
    });

    return NextResponse.json({ success: true, name: trimmed });
  } catch (error) {
    console.error('Update username error:', error);
    return NextResponse.json({ error: 'Gagal update username' }, { status: 500 });
  }
}
