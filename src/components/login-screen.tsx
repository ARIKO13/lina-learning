'use client';

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Sparkles, Zap, Trophy, Flame } from 'lucide-react';
import { useState } from 'react';
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

  const handleLogin = async () => {
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
      const userId = crypto.randomUUID();
      setUser({ id: userId, email: email.trim(), name: name.trim() });
      await fetch('/api/progress/stats?userId=' + userId);
      await fetch('/api/progress/cleanup', { method: 'POST' });
      toast.success('Selamat datang, ' + name.trim() + '!');
      setActiveTab('stt');
    } catch {
      toast.error('Gagal login. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">ARUSHIKO STT</h1>
          <p className="text-sm text-muted-foreground">Belajar sambil main, raih sertifikat!</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" placeholder="Nama kamu" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="kamu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <Button onClick={handleLogin} disabled={loading || !name.trim() || !email.trim()} className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" size="lg">
              <LogIn className="h-4 w-4" />
              {loading ? 'Masuk...' : 'Mulai Belajar'}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">Login Google tersedia di production</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
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
