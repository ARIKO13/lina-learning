'use client';

import { useAppStore } from '@/lib/store';
import { TIERS } from '@/lib/tiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Sparkles, Zap, Trophy, Flame } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const FEATURES = [
  { icon: Zap, title: 'STT Cerdas', desc: 'Speech-to-Text dengan auto-fallback Groq' },
  { icon: Flame, title: 'Game Kompetisi', desc: 'Belajar jadi seru dengan quiz dari transkrip' },
  { icon: Trophy, title: 'Sertifikat', desc: 'Raih sertifikat tahunan buat flex di sosmed' },
  { icon: Sparkles, title: 'Multi AI', desc: 'Gemini, Groq, GLM, Kimi, Gemma tersedia' },
];

export function LoginScreen() {
  const { setUser, setActiveTab } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAuth, setGoogleAuth] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(d => setGoogleAuth(d.googleAuth))
      .catch(() => {});
  }, []);

  // Auto-show demo form if Google OAuth not configured
  useEffect(() => {
    if (!googleAuth) setShowDemo(true);
  }, [googleAuth]);

  const handleGoogleLogin = () => {
    // NextAuth handles the Google OAuth redirect
    window.location.href = '/api/auth/signin/google';
  };

  const handleDemoLogin = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Isi nama dan email ya!');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Format email nggak valid');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setUser({ id: data.id, email: data.email, name: data.name, image: data.image });
      await fetch('/api/progress/cleanup', { method: 'POST' });
      toast.success('Selamat datang, ' + data.name + '!');
      setActiveTab('stt');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">ARUSHIKO STT</h1>
          <p className="text-sm text-muted-foreground">Belajar sambil main, raih sertifikat!</p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 space-y-4">
            {googleAuth && !showDemo ? (
              /* Google OAuth Button */
              <>
                <Button onClick={handleGoogleLogin} className="w-full gap-2 h-12 text-base bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-800" size="lg">
                  <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Masuk dengan Google
                </Button>
                <button onClick={() => setShowDemo(true)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                  Tidak punya akun Google? Login demo
                </button>
              </>
            ) : (
              /* Demo / Manual Login Form */
              <>
                {googleAuth && (
                  <button onClick={() => setShowDemo(false)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    ← Kembali ke login Google
                  </button>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Nama</Label>
                  <Input id="name" placeholder="Nama kamu" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="kamu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleDemoLogin()} />
                </div>
                <Button onClick={handleDemoLogin} disabled={loading || !name.trim() || !email.trim()} className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" size="lg">
                  <LogIn className="h-4 w-4" />
                  {loading ? 'Masuk...' : 'Mulai Belajar'}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  {googleAuth ? 'Mode demo — data disimpan lokal' : 'Google OAuth belum dikonfigurasi. Set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET di environment.'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tier Preview */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-center mb-3">Tier System</p>
            <div className="space-y-2">
              {TIERS.map(t => (
                <div key={t.level} className="flex items-center gap-2">
                  <span className="text-base w-6 text-center">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground">{t.xpRequired.toLocaleString()} XP</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: t.level < TIERS.length ? '100%' : '100%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature pills */}
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-2 rounded-lg border bg-white/60 p-3 dark:bg-slate-800/60">
              <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-semibold">{f.title}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
