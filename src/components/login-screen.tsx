'use client';

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function LoginScreen() {
  const { setUser } = useAppStore();
  const { data: session, status } = useSession();

  // Auto-bridge NextAuth session to Zustand store
  useEffect(() => {
    if (session?.user && status === 'authenticated') {
      const u = session.user;
      setUser({
        id: u.id || u.email || '',
        email: u.email || '',
        name: u.name || 'Player',
        image: u.image || null,
      });
      // Trigger cleanup on first login
      fetch('/api/progress/cleanup', { method: 'POST' }).catch(() => {});
    }
  }, [session, status, setUser]);

  const handleGoogleLogin = async () => {
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch {
      toast.error('Gagal connect ke Google. Coba lagi.');
    }
  };

  // Show loading while session is being checked
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#E85D25]" />
        <p className="mt-3 text-sm text-muted-foreground">Mengecek session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo & Branding */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="/logo.png" alt="LINA" className="h-16 w-16 rounded-2xl" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">LINA.LEARNING</h1>
            <p className="text-sm text-[#666666]">Belajar Sambil Main, Raih Sertifikat!</p>
          </div>
        </div>

        {/* Google OAuth Button */}
        <div className="space-y-3">
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-full bg-[#E85D25] hover:bg-[#D14E1C] text-white font-medium text-base gap-3 transition-colors"
            size="lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#FFFFFF" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#FFFFFF" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FFFFFF" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#FFFFFF" />
            </svg>
            Masuk dengan Google
          </Button>
          <p className="text-[11px] text-center text-[#999999]">
            Login via Google OAuth. Data kamu aman & tersimpan.
          </p>
        </div>
      </div>
    </div>
  );
}
