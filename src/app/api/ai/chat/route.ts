import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  apiKeys: {
    gemini?: string;
    groq?: string;
    cloudflare?: string;
    cloudflareAccountId?: string;
  };
  systemPrompt?: string;
}

// Cloudflare model mapping
const CF_MODELS: Record<string, string> = {
  'cf-glm-4': '@cf/thinklm/glms',
  'cf-kimi-k2': '@cf/moonshotai/kimi-k2-instruct',
  'cf-gemma-3-27b': '@cf/google/gemma-3-27b-it',
};

// Groq model mapping
const GROQ_MODELS: Record<string, string> = {
  'groq-llama-3.3-70b': 'llama-3.3-70b-versatile',
  'groq-deepseek-r1-distill-llama-70b': 'deepseek-r1-distill-llama-70b',
};

// Gemini model mapping
const GEMINI_MODELS: Record<string, string> = {
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
};

async function callGemini(messages: ChatMessage[], model: string, apiKey: string, systemPrompt?: string) {
  const geminiModel = GEMINI_MODELS[model] || 'gemini-2.5-flash-preview-05-20';

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = { contents };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  body.generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 8192,
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

async function callGroq(messages: ChatMessage[], model: string, apiKey: string) {
  const groqModel = GROQ_MODELS[model] || 'llama-3.3-70b-versatile';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: groqModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callCloudflare(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  accountId: string
) {
  const cfModel = CF_MODELS[model];
  if (!cfModel) throw new Error(`Unknown Cloudflare model: ${model}`);

  // Convert to a simple prompt format for CF Workers AI
  const prompt = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n') + '\n\nAssistant:';

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cfModel}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.result?.response || data.result || '';
}

export async function POST(req: NextRequest) {
 try {
    const body: ChatRequest = await req.json();
    const { messages, model, apiKeys, systemPrompt } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    let result = '';

    if (model.startsWith('gemini')) {
      if (!apiKeys.gemini) {
        return NextResponse.json({ error: 'Gemini API key is required' }, { status: 401 });
      }
      result = await callGemini(messages, model, apiKeys.gemini, systemPrompt);
    } else if (model.startsWith('groq')) {
      if (!apiKeys.groq) {
        return NextResponse.json({ error: 'Groq API key is required' }, { status: 401 });
      }
      result = await callGroq(messages, model, apiKeys.groq);
    } else if (model.startsWith('cf-')) {
      if (!apiKeys.cloudflare || !apiKeys.cloudflareAccountId) {
        return NextResponse.json(
          { error: 'Cloudflare API key and Account ID are required' },
          { status: 401 }
        );
      }
      result = await callCloudflare(messages, model, apiKeys.cloudflare, apiKeys.cloudflareAccountId);
    } else {
      return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 });
    }

    return NextResponse.json({ content: result });
  } catch (error) {
    console.error('AI Chat error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
