import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  systemPrompt?: string;
}

// Polyvor Labs Gateway config
const GATEWAY_BASE = 'https://gateway.polyvorlabs.com/api/gateway';

// Model routing: which server + model name for each frontend model ID
const MODEL_ROUTING: Record<string, { server: string; model: string }> = {
  'gemini-3.6-flash': { server: 'server3', model: 'gemini-3.6-flash' },
  'claude-sonnet-5': { server: 'server3', model: 'claude-sonnet-5' },
  'deepseek-v4-flash': { server: 'server3', model: 'deepseek-v4-flash' },
  'deepseek-v4-pro': { server: 'server2', model: 'ds/deepseek-v4-pro' },
  'deepseek-reasoner': { server: 'server2', model: 'ds/deepseek-reasoner' },
  'auto': { server: 'server3', model: 'auto' },
};

function buildPrompt(messages: ChatMessage[], systemPrompt?: string): string {
  const parts: string[] = [];

  if (systemPrompt) {
    parts.push(`[System]: ${systemPrompt}`);
  }

  for (const msg of messages) {
    if (msg.role === 'system') {
      parts.push(`[System]: ${msg.content}`);
    } else if (msg.role === 'user') {
      parts.push(`[User]: ${msg.content}`);
    } else if (msg.role === 'assistant') {
      parts.push(`[Assistant]: ${msg.content}`);
    }
  }

  return parts.join('\n\n');
}

async function callGateway(prompt: string, modelId: string, apiKey: string): Promise<string> {
  const route = MODEL_ROUTING[modelId];
  if (!route) throw new Error(`Unknown model: ${modelId}`);

  const url = `${GATEWAY_BASE}/${route.server}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      model: route.model,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gateway API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  // The gateway might return the response in different formats
  return data.response || data.content || data.text || data.choices?.[0]?.message?.content || JSON.stringify(data);
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, model, systemPrompt } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const apiKey = process.env.GATEWAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }

    const prompt = buildPrompt(messages, systemPrompt);
    const result = await callGateway(prompt, model, apiKey);

    return NextResponse.json({ content: result });
  } catch (error) {
    console.error('AI Chat error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
