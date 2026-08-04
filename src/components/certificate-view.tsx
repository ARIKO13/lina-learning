'use client';

import { useAppStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Share2, Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CertData {
  season: number;
  year: string;
  totalXP: number;
  totalDays: number;
  maxLevel: number;
  maxStreak: number;
  awardedAt: string;
  expiresAt: string;
  shareCode: string;
  daysUntilExpiry: number;
}

export function CertificateView() {
  const { showCertificate, setShowCertificate, user } = useAppStore();
  const [cert, setCert] = useState<CertData | null>(null);

  useEffect(() => {
    if (showCertificate && user) {
      fetch(`/api/progress/certificate?userId=${user.id}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setCert(d); });
    }
  }, [showCertificate, user]);

  const handleShare = async () => {
    if (!cert) return;
    const text = `🎓 Saya baru saja menyelesaikan Season ${cert.season} di ARUSHIKO STT!\n\n🏆 Level ${cert.maxLevel} | ${cert.totalXP} XP | ${cert.totalDays} hari belajar\n🔥 Max Streak: ${cert.maxStreak} hari\n\n#BelajarSambilMain #ARUSHIKO`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Sertifikat ARUSHIKO STT', text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert('Teks sertifikat disalin ke clipboard!');
    }
  };

  return (
    <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {cert && user && (
          <div className="relative">
            {/* Certificate Design */}
            <div className="relative bg-gradient-to-br from-amber-50 via-white to-violet-50 p-8 text-center">
              {/* Decorative border */}
              <div className="absolute inset-2 rounded-xl border-2 border-dashed border-amber-300/50" />

              <div className="relative space-y-4">
                <div className="flex justify-center">
                  <Award className="h-12 w-12 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-amber-600">Sertifikat Kompetensi</p>
                  <h2 className="mt-1 text-xl font-bold">ARUSHIKO STT</h2>
                  <p className="text-xs text-muted-foreground">Season {cert.season} - {cert.year}</p>
                </div>

                <div className="py-2">
                  <p className="text-xs text-muted-foreground">Diberikan kepada</p>
                  <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {user.name}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  Telah menyelesaikan {cert.totalDays} hari pembelajaran aktif<br />
                  dengan pencapaian {cert.totalXP} Total XP, mencapai Level {cert.maxLevel}<br />
                  dan streak terpanjang {cert.maxStreak} hari berturut-turut.
                </p>

                <div className="flex justify-center gap-6 pt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{cert.totalXP}</p>
                    <p className="text-[10px] text-muted-foreground">Total XP</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-600">Lv.{cert.maxLevel}</p>
                    <p className="text-[10px] text-muted-foreground">Max Level</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{cert.maxStreak}</p>
                    <p className="text-[10px] text-muted-foreground">Max Streak</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/50">
                  <p className="text-[10px] text-muted-foreground">
                    Sertifikat ini berlaku hingga {new Date(cert.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-amber-600 font-medium">
                    {cert.daysUntilExpiry} hari tersisa sebelum dihapus
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 border-t">
              <Button onClick={handleShare} className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600">
                <Share2 className="h-4 w-4" /> Share ke Sosmed
              </Button>
              <Button variant="outline" onClick={() => setShowCertificate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
