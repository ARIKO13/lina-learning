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
  const { user, setUser, activeTab, setActiveTab, setSettingsOpen, sttSource, sttStatus, apiKeys } = useAppStore();
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-2 border-[#E85D25] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const hasAnyKey = !!(apiKeys.groq || apiKeys.gemini || apiKeys.cloudflare);

  const handleLogout = async () => {
    setUser(null);
    await signOut({ callbackUrl: '/' });
  };

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E5E5E5] flex flex-col transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[#E5E5E5]">
          <img src="/logo.png" alt="LINA" className="h-8 w-8 rounded-lg" />
          <span className="text-base font-bold tracking-tight text-[#111111]">LINA</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 rounded-md hover:bg-[#F5F5F5]"
          >
            <X className="h-5 w-5 text-[#666666]" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all border-l-2',
                  isActive
                    ? 'bg-[#FFF5F0] text-[#E85D25] border-[#E85D25]'
                    : 'text-[#666666] border-transparent hover:bg-[#F5F5F5] hover:text-[#111111]'
                )}
              >
                <Icon className={cn('h-4.5 w-4.5', isActive ? 'text-[#E85D25]' : 'text-[#999999]')} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-[#E5E5E5] p-3 space-y-1">
          <button
            onClick={() => { setSettingsOpen(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#666666] hover:bg-[#F5F5F5] hover:text-[#111111] transition-colors"
          >
            <Settings className="h-4.5 w-4.5 text-[#999999]" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#666666] hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#F5F5F5] transition-colors"
            >
              <Menu className="h-5 w-5 text-[#666666]" />
            </button>
            <h1 className="text-base font-semibold text-[#111111]">{TAB_TITLES[activeTab]}</h1>
            {sttStatus === 'recording' && activeTab === 'stt' && (
              <Badge variant="outline" className={cn('gap-1.5 text-xs animate-pulse hidden sm:flex', sttSource === 'webspeech' ? 'border-orange-300 text-orange-600' : 'border-amber-300 text-amber-600')}>
                {sttSource === 'webspeech' ? <Wifi className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
                {sttSource === 'webspeech' ? 'LIVE' : 'GROQ'}
              </Badge>
            )}
            {!hasAnyKey && (
              <Badge variant="outline" className="gap-1 text-xs border-amber-300 text-amber-600 hidden sm:flex">
                <WifiOff className="h-3 w-3" />No API Key
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="hidden md:flex p-2 rounded-lg hover:bg-[#F5F5F5] transition-colors"
            >
              <Settings className="h-4.5 w-4.5 text-[#999999]" />
            </button>
            <div className="flex items-center gap-2">
              {user?.image ? (
                <img src={user.image} className="h-8 w-8 rounded-full" alt={user.name || ''} />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E85D25] text-white text-sm font-bold">
                  {user?.name?.[0] || '?'}
                </div>
              )}
              <span className="text-sm font-medium text-[#111111] hidden sm:block">{user?.name || 'Player'}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
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
