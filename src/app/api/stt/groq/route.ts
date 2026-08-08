import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Server-side API key only
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'STT service unavailable' }, { status: 503 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('file') as File | null;
    const model = (formData.get('model') as string) || 'whisper-large-v3-turbo';
    const language = (formData.get('language') as string) || 'id';
    const responseFormat = (formData.get('response_format') as string) || 'text';

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const body = new FormData();
    body.append('file', audioFile);
    body.append('model', model);
    body.append('language', language);
    body.append('response_format', responseFormat);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq STT error:', err);
      return NextResponse.json({ error: `Groq API error: ${response.status}` }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('STT Groq route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
