import { NextRequest, NextResponse } from 'next/server';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, apiKey, model } = await req.json();

    if (!transcript || transcript.trim().length < 20) {
      return NextResponse.json({ error: 'Transkrip terlalu pendek (min 20 karakter)' }, { status: 400 });
    }

    const prompt = `Kamu adalah game master untuk game edukasi komunitas Gen Z & Alpha. Buatkan 10 soal quiz kompetisi berdasarkan transkrip berikut.

Transkrip:
${transcript}

PENTING:
- Soal harus relevan dengan materi di transkrip
- Campurkan tingkat kesulitan: 3 easy, 4 medium, 3 hard
- Buat opsi jawaban yang menarik dan kadang bikin mikir
- Tambahkan penjelasan singkat untuk setiap jawaban benar
- Difficulty: easy = 10 XP, medium = 20 XP, hard = 30 XP

Kembalikan HANYA JSON array tanpa markdown. Format:
[{"id":1,"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","difficulty":"easy"}]`;

    const aiRes = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: model || 'gemini-2.5-flash',
        apiKeys: { gemini: apiKey?.gemini || '', groq: apiKey?.groq || '', cloudflare: apiKey?.cloudflare || '', cloudflareAccountId: apiKey?.cloudflareAccountId || '' },
        systemPrompt: 'Kamu adalah game master edukasi. Hanya kembalikan valid JSON array. Jangan gunakan markdown code blocks.',
      }),
    });

    const aiData = await aiRes.json();
    if (aiData.error) throw new Error(aiData.error);

    let questions: QuizQuestion[];
    try {
      const cleaned = aiData.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      questions = JSON.parse(cleaned);
    } catch {
      throw new Error('Gagal parse soal dari AI. Coba lagi.');
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI tidak menghasilkan soal yang valid');
    }

    return NextResponse.json({ questions, topic: detectTopic(transcript) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Gagal generate quiz';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function detectTopic(transcript: string): string {
  const lower = transcript.toLowerCase();
  const topicKeywords: Record<string, string[]> = {
    'Konten & Media Sosial': ['video', 'tiktok', 'instagram', 'youtube', 'konten', 'foto', 'review', 'booktok'],
    'Gaming & Esports': ['game', 'gaming', 'esport', 'multiplayer', 'rank', 'turnamen', 'pc', 'mobile'],
    'Kerajinan Tangan & Retro': ['merajut', 'menyulam', 'tembikar', 'kerajinan', 'diy', 'craft'],
    'Thrifting & Fashion': ['thrifting', 'baju bekas', 'fashion', 'ootd', 'dekorasi', 'desk'],
    'Game Interaktif': ['virtual', 'animasi', 'interaktif', 'dunia game', 'vr'],
    'Video Visual': ['animasi', 'visual', 'edukasi', 'slang', 'tren'],
    'Belajar Praktik': ['praktik', 'hands-on', 'kreativitas', 'fisik', 'digital'],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) return topic;
  }
  return 'Umum';
}
