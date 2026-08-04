'use client';

import { useAppStore } from '@/lib/store';
import { STTPanel } from '@/components/stt-panel';
import { GamePanel } from '@/components/game-panel';
import { DashboardPanel } from '@/components/dashboard-panel';
import { AIAssistant } from '@/components/ai-assistant';
import { SettingsDialog } from '@/components/settings-dialog';
import { LoginScreen } from '@/components/login-screen';
import { CertificateView } from '@/components/certificate-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mic, Gamepad2, BarChart3, Bot, Settings, Wifi, WifiOff, Radio, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'stt' as const, label: 'Speech to Text', icon: Mic },
  { id: 'game' as const, label: 'Game Kompetisi', icon: Gamepad2 },
  { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  { id: 'assistant' as const, label: 'AI Assistant', icon: Bot },
];

export default function Home() {
  const { user, setUser, activeTab, setActiveTab, setSettingsOpen, sttSource, sttStatus, apiKeys } = useAppStore();

  if (!user) return <LoginScreen />;

  const hasAnyKey = !!(apiKeys.groq || apiKeys.gemini || apiKeys.cloudflare);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-lg dark:bg-slate-950/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold leading-tight">ARUSHIKO STT</h1>
              <p className="text-[10px] text-muted-foreground">Speech Workflow App</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sttStatus === 'recording' && (
              <Badge variant="outline" className={cn('gap-1.5 text-xs animate-pulse hidden sm:flex', sttSource === 'webspeech' ? 'border-emerald-300 text-emerald-600' : 'border-amber-300 text-amber-600')}>
                {sttSource === 'webspeech' ? <Wifi className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
                {sttSource === 'webspeech' ? 'LIVE' : 'GROQ'}
              </Badge>
            )}
            {!hasAnyKey && (
              <Badge variant="outline" className="gap-1 text-xs border-amber-300 text-amber-600 hidden sm:flex">
                <WifiOff className="h-3 w-3" />No API Key
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setUser(null); }} className="h-8 w-8" title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-4">
        <div className="mb-4 flex gap-1 rounded-xl bg-muted/50 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs sm:text-sm font-medium transition-all',
                  activeTab === tab.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="min-h-[calc(100vh-10rem)]">
          {activeTab === 'stt' && <STTPanel />}
          {activeTab === 'game' && <GamePanel />}
          {activeTab === 'dashboard' && <DashboardPanel />}
          {activeTab === 'assistant' && (
            <div className="h-[calc(100vh-10rem)]"><AIAssistant /></div>
          )}
        </div>
      </main>

      <footer className="mt-auto border-t py-3 text-center text-xs text-muted-foreground">
        <p>ARUSHIKO STT - Belajar Sambil Main, Raih Sertifikat!</p>
      </footer>

      <SettingsDialog />
      <CertificateView />
    </div>
  );
}