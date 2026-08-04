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
import { Send, Trash2, Loader2, Bot, User, Settings, Sparkles, Globe, Zap } from 'lucide-react';
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
    scrapeMode,
    setScrapeMode,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [scrapeSources, setScrapeSources] = useState<{title: string; url: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const userMsg = input.trim();
    setInput('');
    addAiMessage({ role: 'user', content: userMsg });
    setIsAiLoading(true);
    setScrapeSources([]);

    try {
      if (scrapeMode) {
        if (!apiKeys.gemini) {
          toast.error('API key Gemini diperlukan untuk mode Web Scrape. Buka Settings.');
          setIsAiLoading(false);
          return;
        }

        const res = await fetch('/api/scrape-and-ask?XTransformPort=3030', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: userMsg,
            apiKey: apiKeys.gemini,
            systemPrompt: 'Kamu adalah asisten AI LINA.LEARNING. Jawab berdasarkan konten web yang di-scrape. Jelaskan dengan bahasa Indonesia yang jelas dan terstruktur.',
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setScrapeSources(data.sources || []);

        addAiMessage({
          role: 'assistant',
          content: data.text,
          model: `gemini+scrape (${data.scrapeCount || 0} sources)`,
        });
      } else if (getProviderForModel(selectedModel) === 'gemini') {
        if (!apiKeys.gemini) {
          toast.error('API key Gemini belum diatur. Buka Settings.');
          setIsAiLoading(false);
          return;
        }

        const messages = [
          ...aiMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: userMsg },
        ];

        const res = await fetch('/api/gemini/chat?XTransformPort=3030', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, apiKey: apiKeys.gemini }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        addAiMessage({ role: 'assistant', content: data.text, model: selectedModel });
      } else {
        if (!hasRequiredKey(selectedModel)) {
          const provider = getProviderForModel(selectedModel);
          toast.error(`API key ${provider} belum diatur. Buka Settings.`);
          setIsAiLoading(false);
          return;
        }

        const messages = [
          ...aiMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: userMsg },
        ];

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, model: selectedModel, apiKeys }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        addAiMessage({ role: 'assistant', content: data.content, model: selectedModel });
      }
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
    <Card className="flex h-full flex-col border border-[#E5E5E5] bg-white shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#E85D25]" />
            <CardTitle className="text-base font-semibold text-[#111111]">AI Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {transcript && (
              <Button onClick={handleUseTranscript} variant="ghost" size="sm" className="gap-1.5 text-xs text-[#666666]">
                <Sparkles className="h-3 w-3" />
                Gunakan Transkrip
              </Button>
            )}
            <Button onClick={clearAiMessages} variant="ghost" size="sm" className="gap-1.5 text-[#999999]" disabled={aiMessages.length === 0}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScrapeMode(!scrapeMode)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
              scrapeMode
                ? 'border-[#E85D25] bg-orange-50 text-[#E85D25] dark:bg-orange-950/30 dark:border-[#E85D25] dark:text-[#E85D25]'
                : 'border-[#E5E5E5] hover:border-[#999999] text-[#666666]'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            Web Scrape
            {scrapeMode && <Zap className="h-3 w-3" />}
          </button>

          {!scrapeMode ? (
            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as AIModel)}>
              <SelectTrigger className="h-8 w-[180px] text-xs border-[#E5E5E5]">
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
                          model.provider === 'gemini' && 'border-sky-300 text-sky-600',
                          model.provider === 'groq' && 'border-orange-300 text-[#E85D25]',
                          model.provider === 'cloudflare' && 'border-amber-300 text-amber-600'
                        )}
                      >
                        {model.provider}
                      </Badge>
                      <span className="text-[#111111]">{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge className="gap-1 text-xs border-sky-300 text-sky-600 bg-sky-50">
              <Zap className="h-3 w-3" /> Gemini + Web Scrape
            </Badge>
          )}

          {!scrapeMode && !hasRequiredKey(selectedModel) && (
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
              <Settings className="h-3 w-3" />
              Set API Key
            </button>
          )}
          {scrapeMode && !apiKeys.gemini && (
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
              <Settings className="h-3 w-3" />
              Set Gemini Key
            </button>
          )}
        </div>

        {scrapeMode && (
          <p className="mt-2 text-[11px] text-[#E85D25]">
            Mode aktif: pertanyaan kamu akan di-scrape dari web, lalu AI menjelaskan. Hemat token!
            {scrapeSources.length > 0 && ` (${scrapeSources.length} sumber terpakai)`}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden pt-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3">
          {aiMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <Bot className="mb-2 h-10 w-10 text-[#E5E5E5]" />
              <p className="text-sm font-medium text-[#999999]">AI Assistant siap membantu</p>
              <p className="mt-1 text-xs text-[#E5E5E5]">
                {scrapeMode ? 'Aktifkan Web Scrape, tanyakan apa saja — AI akan cari + jelaskan' : 'Pilih model di atas, lalu tanyakan apa saja'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50">
                      <Bot className="h-4 w-4 text-[#E85D25]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                      msg.role === 'user' ? 'bg-[#E85D25] text-white' : 'bg-white border border-[#E5E5E5] text-[#111111]'
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    {msg.model && (
                      <div className="mt-1 text-[10px] opacity-60">
                        {msg.model.includes('+scrape') ? (
                          <span className="text-[#E85D25]">{msg.model}</span>
                        ) : (
                          MODEL_LIST.find((m) => m.id === msg.model)?.name || msg.model
                        )}
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.model?.includes('+scrape') && scrapeSources.length > 0 && (
                      <div className="mt-2 border-t border-dashed border-[#E5E5E5] pt-2">
                        <p className="text-[10px] font-medium text-[#999999] mb-1">Sumber:</p>
                        {scrapeSources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                            className="block text-[10px] text-[#E85D25] hover:underline truncate">
                            {s.title || s.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111]">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isAiLoading && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50">
                    <Bot className="h-4 w-4 text-[#E85D25]" />
                  </div>
                  <div className="rounded-xl bg-white border border-[#E5E5E5] px-3 py-2">
                    {scrapeMode ? (
                      <div className="flex items-center gap-2 text-xs text-[#999999]">
                        <Globe className="h-3.5 w-3.5 animate-pulse" />
                        <span>Scraping web...</span>
                      </div>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-[#999999]" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={scrapeMode ? 'Tanyakan apa saja (akan di-scrape dari web)...' : 'Ketik pesan... (Enter untuk kirim)'}
            className="min-h-[44px] max-h-[120px] resize-none border-[#E5E5E5]"
            rows={1}
            disabled={isAiLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isAiLoading}
            size="icon"
            className={cn(
              'h-[44px] w-[44px] shrink-0 rounded-full',
              scrapeMode ? 'bg-[#E85D25] hover:bg-[#D14E1C] text-white' : 'bg-[#E85D25] hover:bg-[#D14E1C] text-white'
            )}
          >
            {isAiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : scrapeMode ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
