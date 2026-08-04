'use client';

import { useAppStore, MODEL_LIST, type AIModel } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Trash2, Loader2, Bot, User, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function AIAssistant() {
  const {
    aiMessages,
    addAiMessage,
    clearAiMessages,
    selectedModel,
    setSelectedModel,
    isAiLoading,
    setIsAiLoading,
    apiKeys,
    transcript,
    setSettingsOpen,
  } = useAppStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const getProviderForModel = (model: AIModel) => {
    return MODEL_LIST.find((m) => m.id === model)?.provider;
  };

  const hasRequiredKey = (model: AIModel) => {
    const provider = getProviderForModel(model);
    if (provider === 'gemini') return !!apiKeys.gemini;
    if (provider === 'groq') return !!apiKeys.groq;
    if (provider === 'cloudflare') return !!(apiKeys.cloudflare && apiKeys.cloudflareAccountId);
    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || isAiLoading) return;

    if (!hasRequiredKey(selectedModel)) {
      const provider = getProviderForModel(selectedModel);
      toast.error(`API key ${provider} belum diatur. Buka Settings.`);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    addAiMessage({ role: 'user', content: userMsg });
    setIsAiLoading(true);

    try {
      const messages = [
        ...aiMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMsg },
      ];

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: selectedModel,
          apiKeys,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      addAiMessage({
        role: 'assistant',
        content: data.content,
        model: selectedModel,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Gagal mendapatkan respons';
      toast.error(msg);
      addAiMessage({ role: 'assistant', content: `\u26a0\ufe0f Error: ${msg}` });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUseTranscript = () => {
    if (transcript) {
      setInput(transcript);
      textareaRef.current?.focus();
    }
  };

  return (
    <Card className="flex h-full flex-col border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">AI Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {transcript && (
              <Button
                onClick={handleUseTranscript}
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
              >
                <Sparkles className="h-3 w-3" />
                Gunakan Transkrip
              </Button>
            )}
            <Button
              onClick={clearAiMessages}
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={aiMessages.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="mt-2 flex items-center gap-2">
          <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as AIModel)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_LIST.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5',
                        model.provider === 'gemini' && 'border-blue-300 text-blue-600',
                        model.provider === 'groq' && 'border-orange-300 text-orange-600',
                        model.provider === 'cloudflare' && 'border-amber-300 text-amber-600'
                      )}
                    >
                      {model.provider}
                    </Badge>
                    <span>{model.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!hasRequiredKey(selectedModel) && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
            >
              <Settings className="h-3 w-3" />
              Set API Key
            </button>
          )}
        </div>
      </CardHeader>

      {/* Chat Messages */}
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden pt-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-3">
          {aiMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <Bot className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                AI Assistant siap membantu
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Pilih model di atas, lalu tanyakan apa saja
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    {msg.model && (
                      <div className="mt-1 text-[10px] opacity-60">
                        {MODEL_LIST.find((m) => m.id === msg.model)?.name || msg.model}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isAiLoading && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan... (Enter untuk kirim)"
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isAiLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isAiLoading}
            size="icon"
            className="h-[44px] w-[44px] shrink-0"
          >
            {isAiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
