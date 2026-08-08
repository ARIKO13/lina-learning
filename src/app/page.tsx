'use client';

import { useAppStore } from '@/lib/store';
import { STTPanel } from '@/components/stt-panel';
import { GamePanel } from '@/components/game-panel';
import { DashboardPanel } from '@/components/dashboard-panel';
import { AIAssistant } from '@/components/ai-assistant';
import { SettingsDialog } from '@/components/settings-dialog';
import { LoginScreen } from '@/components/login-screen';
import { CertificateView } from '@/components/certificate-view';
import { Badge } from '@/components/ui/badge';
import {
  Mic, Gamepad2, BarChart3, Bot, Settings, Wifi, WifiOff, Radio, LogOut,
  Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

type TabId = 'stt' | 'game' | 'dashboard' | 'assistant';

const TABS: { id: TabId; label: string; icon: typeof Mic }[] = [
  { id: 'stt', label: 'Speech to Text', icon: Mic },
  { id: 'game', label: 'Game Kompetisi', icon: Gamepad2 },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'assistant', label: 'AI Assistant', icon: Bot },
];

const TAB_TITLES: Record<TabId, string> = {
  stt: 'Speech to Text',
  game: 'Game Kompetisi',
  dashboard: 'Dashboard',
  assistant: 'AI Assistant',
};

export default function Home() {
  const { user, setUser, activeTab, setActiveTab, setSettingsOpen, sttSource, sttStatus } = useAppStore();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (session?.user && status === 'authenticated') {
      const u = session.user;
      setUser({
        id: u.id || u.email || '',
        email: u.email || '',
        name: u.name || 'Player',
        image: u.image || null,
      });
    }
  }, [session, status, setUser]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="animate-spin h-8 w-8 border-2 border-[#E85D25] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const handleLogout = async () => {
    setUser(null);
    await signOut({ callbackUrl: '/' });
  };

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#09090b]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] bg-[#0c0c0e] border-r border-white/[0.06] flex flex-col transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-5 h-14 border-b border-white/[0.06]">
          <img src="/logo.png" alt="LINA" className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-semibold tracking-tight text-white">LINA.LEARNING</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 rounded-md hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all',
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-[#E85D25]' : 'text-zinc-600')} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3 space-y-0.5">
          <button
            onClick={() => { setSettingsOpen(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 bg-[#09090b]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <Menu className="h-4 w-4 text-zinc-400" />
            </button>
            <h1 className="text-sm font-medium text-zinc-200">{TAB_TITLES[activeTab]}</h1>
            {sttStatus === 'recording' && activeTab === 'stt' && (
              <Badge variant="outline" className={cn('gap-1.5 text-[11px] animate-pulse hidden sm:flex border-red-500/30 text-red-400 bg-red-500/10', sttSource === 'webspeech' ? '' : 'border-amber-500/30 text-amber-400 bg-amber-500/10')}>
                {sttSource === 'webspeech' ? <Wifi className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
                {sttSource === 'webspeech' ? 'LIVE' : 'GROQ'}
              </Badge>
            )}

          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="hidden md:flex p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <Settings className="h-4 w-4 text-zinc-500" />
            </button>
            <div className="flex items-center gap-2.5">
              {user?.image ? (
                <img src={user.image} className="h-7 w-7 rounded-full ring-2 ring-white/10" alt={user.name || ''} />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E85D25] text-white text-xs font-bold">
                  {user?.name?.[0] || '?'}
                </div>
              )}
              <span className="text-sm text-zinc-300 hidden sm:block">{user?.name || 'Player'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'stt' && <STTPanel />}
            {activeTab === 'game' && <GamePanel />}
            {activeTab === 'dashboard' && <DashboardPanel />}
            {activeTab === 'assistant' && (
              <div className="h-[calc(100vh-8rem)]"><AIAssistant /></div>
            )}
          </div>
        </main>
      </div>

      <SettingsDialog />
      <CertificateView />
    </div>
  );
}
