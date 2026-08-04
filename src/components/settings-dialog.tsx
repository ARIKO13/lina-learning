'use client';

import { useAppStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Eye, EyeOff, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen, apiKeys, setApiKeys } = useAppStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [localKeys, setLocalKeys] = useState(apiKeys);

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setApiKeys(localKeys);
    setSettingsOpen(false);
    toast.success('API keys berhasil disimpan!');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLocalKeys(apiKeys);
    }
    setSettingsOpen(open);
  };

  const isSet = (key: keyof typeof apiKeys) => !!apiKeys[key];

  return (
    <Dialog open={settingsOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <DialogTitle>API Settings</DialogTitle>
          </div>
          <DialogDescription>
            Atur API key untuk mengakses layanan AI. Key disimpan di browser kamu (localStorage).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Groq API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="groq-key" className="text-sm font-medium">
                Groq API Key
              </Label>
              <div className="flex items-center gap-1.5">
                {isSet('groq') && (
                  <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-600 text-[10px]">
                    <Check className="h-2.5 w-2.5" />
                    Aktif
                  </Badge>
                )}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Get Key <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
            <div className="relative">
              <Input
                id="groq-key"
                type={showKeys.groq ? 'text' : 'password'}
                value={localKeys.groq}
                onChange={(e) => setLocalKeys((prev) => ({ ...prev, groq: e.target.value }))}
                placeholder="gsk_..."
                className="pr-10"
              />
              <button
                onClick={() => toggleShowKey('groq')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys.groq ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Digunakan untuk STT fallback (Whisper) dan chat AI
            </p>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="gemini-key" className="text-sm font-medium">
                Gemini API Key
              </Label>
              <div className="flex items-center gap-1.5">
                {isSet('gemini') && (
                  <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-600 text-[10px]">
                    <Check className="h-2.5 w-2.5" />
                    Aktif
                  </Badge>
                )}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Get Key <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
            <div className="relative">
              <Input
                id="gemini-key"
                type={showKeys.gemini ? 'text' : 'password'}
                value={localKeys.gemini}
                onChange={(e) => setLocalKeys((prev) => ({ ...prev, gemini: e.target.value }))}
                placeholder="AIza..."
                className="pr-10"
              />
              <button
                onClick={() => toggleShowKey('gemini')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Google Gemini untuk chat dan generate konten
            </p>
          </div>

          {/* Cloudflare API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cf-key" className="text-sm font-medium">
                Cloudflare API Key
              </Label>
              <div className="flex items-center gap-1.5">
                {isSet('cloudflare') && (
                  <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-600 text-[10px]">
                    <Check className="h-2.5 w-2.5" />
                    Aktif
                  </Badge>
                )}
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Get Key <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
            <div className="relative">
              <Input
                id="cf-key"
                type={showKeys.cloudflare ? 'text' : 'password'}
                value={localKeys.cloudflare}
                onChange={(e) => setLocalKeys((prev) => ({ ...prev, cloudflare: e.target.value }))}
                placeholder="Cloudflare API Token"
                className="pr-10"
              />
              <button
                onClick={() => toggleShowKey('cloudflare')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys.cloudflare ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Cloudflare Account ID */}
          <div className="space-y-2">
            <Label htmlFor="cf-account-id" className="text-sm font-medium">
              Cloudflare Account ID
            </Label>
            <Input
              id="cf-account-id"
              type={showKeys.cloudflareAccountId ? 'text' : 'password'}
              value={localKeys.cloudflareAccountId}
              onChange={(e) => setLocalKeys((prev) => ({ ...prev, cloudflareAccountId: e.target.value }))}
              placeholder="Account ID dari dashboard"
              className={cn('pr-10', !isSet('cloudflare') && 'opacity-50')}
              disabled={!localKeys.cloudflare}
            />
            <p className="text-[11px] text-muted-foreground">
              Untuk akses Workers AI (GLM, Kimi, Gemma)
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave}>Simpan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
