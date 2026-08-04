'use client';

import { useAppStore, MODEL_LIST, type AIModel } from '@/lib/store';
import { Button } from '@/components/ui/button';
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
      addAiMessage({ role: 'assistant', content: `Error: ${msg}` });
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
    <div className="flex h-full flex-col rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#E85D25]" />
            <span className="text-sm font-medium text-zinc-200">AI Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            {transcript && (
              <button onClick={handleUseTranscript} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                <Sparkles className="h-3 w-3" />
                Gunakan Transkrip
              </button>
            )}
            <button onClick={clearAiMessages} disabled={aiMessages.length === 0} className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-30">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScrapeMode(!scrapeMode)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
              scrapeMode
                ? 'border-[#E85D25]/40 bg-[#E85D25]/10 text-[#E85D25]'
                : 'border-white/[0.08] hover:border-white/[0.15] text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Globe className="h-3 w-3" />
            Web Scrape
            {scrapeMode && <Zap className="h-3 w-3" />}
          </button>

          {!scrapeMode ? (
            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as AIModel)}>
              <SelectTrigger className="h-7 w-[180px] text-[11px] border-white/[0.08] bg-transparent text-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/[0.08] bg-[#18181b]">
                {MODEL_LIST.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-xs text-zinc-300 focus:bg-white/[0.06] focus:text-white">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5',
                          model.provider === 'gemini' && 'border-sky-500/30 text-sky-400',
                          model.provider === 'groq' && 'border-[#E85D25]/30 text-[#E85D25]',
                          model.provider === 'cloudflare' && 'border-amber-500/30 text-amber-400'
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
          ) : (
            <Badge variant="outline" className="gap-1 text-[11px] border-sky-500/30 text-sky-400 bg-sky-500/10">
              <Zap className="h-3 w-3" /> Gemini + Web Scrape
            </Badge>
          )}

          {!scrapeMode && !hasRequiredKey(selectedModel) && (
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline">
              <Settings className="h-3 w-3" />
              Set API Key
            </button>
          )}
          {scrapeMode && !apiKeys.gemini && (
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline">
              <Settings className="h-3 w-3" />
              Set Gemini Key
            </button>
          )}
        </div>

        {scrapeMode && (
          <p className="text-[11px] text-zinc-500">
            Mode aktif: pertanyaan kamu akan di-scrape dari web, lalu AI menjelaskan. Hemat token!
            {scrapeSources.length > 0 && ` (${scrapeSources.length} sumber terpakai)`}
          </p>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {aiMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <Bot className="mb-2 h-10 w-10 text-zinc-800" />
            <p className="text-sm font-medium text-zinc-600">AI Assistant siap membantu</p>
            <p className="mt-1 text-xs text-zinc-700">
              {scrapeMode ? 'Aktifkan Web Scrape, tanyakan apa saja - AI akan cari + jelaskan' : 'Pilih model di atas, lalu tanyakan apa saja'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {aiMessages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E85D25]/10">
                    <Bot className="h-3.5 w-3.5 text-[#E85D25]" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-[#E85D25] text-white'
                      : 'bg-white/[0.06] text-zinc-200 border border-white/[0.06]'
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  {msg.model && (
                    <div className="mt-1.5 text-[10px] opacity-50">
                      {msg.model.includes('+scrape') ? (
                        <span className="text-[#E85D25]">{msg.model}</span>
                      ) : (
                        MODEL_LIST.find((m) => m.id === msg.model)?.name || msg.model
                      )}
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.model?.includes('+scrape') && scrapeSources.length > 0 && (
                    <div className="mt-2 border-t border-white/[0.06] pt-2">
                      <p className="text-[10px] font-medium text-zinc-500 mb-1">Sumber:</p>
                      {scrapeSources.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                          className="block text-[10px] text-[#E85D25] hover:underline truncate"
                        >
                          {s.title || s.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <User className="h-3.5 w-3.5 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
            {isAiLoading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E85D25]/10">
                  <Bot className="h-3.5 w-3.5 text-[#E85D25]" />
                </div>
                <div className="rounded-xl bg-white/[0.06] border border-white/[0.06] px-3.5 py-2.5">
                  {scrapeMode ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Globe className="h-3.5 w-3.5 animate-pulse" />
                      <span>Scraping web...</span>
                    </div>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={scrapeMode ? 'Tanyakan apa saja (akan di-scrape dari web)...' : 'Ketik pesan... (Enter untuk kirim)'}
            className="min-h-[44px] max-h-[120px] resize-none border-white/[0.08] bg-[#0c0c0e] text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-white/[0.08]"
            rows={1}
            disabled={isAiLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isAiLoading}
            size="icon"
            className="h-[44px] w-[44px] shrink-0 rounded-lg bg-[#E85D25] hover:bg-[#d14e1c] text-white"
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
      </div>
    </div>
  );
}
