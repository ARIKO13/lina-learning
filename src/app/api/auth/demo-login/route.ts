import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Demo login fallback when Google OAuth is not configured.
// In production with GOOGLE_CLIENT_ID set, this route is unused.
export async function POST(req: NextRequest) {
  try {
    const { name, email, image } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi' }, { status: 400 });
    }

    // Find or create user in DB
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      user = await db.user.create({
        data: { id: crypto.randomUUID(), googleId: 'demo-' + crypto.randomUUID(), email, name, image: image || null },
      });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json({ error: 'Gagal login' }, { status: 500 });
  }
}
