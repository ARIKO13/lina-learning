import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';

export async function GET() {
  try {
    const buffer = await readFile('/tmp/lina-src.tar.gz');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="lina-learning-src.tar.gz"',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
