'use client';

import { useAppStore, LEVEL_NAMES } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Zap, Flame, Target, Calendar, Trophy, Award,
  TrendingUp, BookOpen, Clock, ArrowRight, Share2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const LEVEL_NAMES_LIST = [
  'Newbie', 'Rookie', 'Learner', 'Explorer', 'Scholar',
  'Expert', 'Master', 'Legend', 'Mythic', 'Grandmaster',
];

function getLevelName(level: number) {
  return LEVEL_NAMES_LIST[Math.min(level - 1, LEVEL_NAMES_LIST.length - 1)] || 'Ascendant';
}

interface MonthlyRecap {
  id: string;
  yearMonth: string;
  totalXP: number;
  totalDays: number;
  avgScore: number;
  bestScore: number;
  topicsCovered: string;
  level: number;
}

interface CertificateData {
  id: string;
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

export function DashboardPanel() {
  const { user, userStats, setUserStats, setShowCertificate, setActiveTab } = useAppStore();
  const [recaps, setRecaps] = useState<MonthlyRecap[]>([]);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/progress/stats?userId=${user.id}`)
      .then(r => r.json())
      .then(setUserStats);
    fetch(`/api/progress/recap?userId=${user.id}`)
      .then(r => r.json())
      .then(d => setRecaps(d.recaps || []));
    fetch(`/api/progress/certificate?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setCertificate(d); });
  }, [user, setUserStats]);

  const stats = userStats;

  return (
    <div className="space-y-4">
      {/* Certificate Banner */}
      {certificate && (
        <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Sertifikat Season {certificate.season} Tersedia!
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {certificate.daysUntilExpiry} hari lagi sebelum dihapus. Flex di sosmed sekarang!
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowCertificate(true)}>
                <Trophy className="h-3.5 w-3.5" /> Lihat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Zap} label="Total XP" value={String(stats?.xp || 0)} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-950/30" />
        <StatCard icon={Target} label="Level" value={`${stats?.level || 1} - ${getLevelName(stats?.level || 1)}`} color="text-violet-600" bg="bg-violet-50 dark:bg-violet-950/30" />
        <StatCard icon={Flame} label="Streak" value={`${stats?.streak || 0} hari`} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-950/30" />
        <StatCard icon={Calendar} label="Bulan Ini" value={`${stats?.monthlyDays || 0} hari main`} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/30" />
      </div>

      {/* Season Progress */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Season {stats?.currentSeason || 1} Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat icon={BookOpen} label="Topik Dipelajari" value={`${recaps.reduce((s, r) => s + (JSON.parse(r.topicsCovered || '[]') as string[]).length, 0)}`} />
            <MiniStat icon={TrendingUp} label="Rata-rata Score" value={`${recaps.length ? Math.round(recaps.reduce((s, r) => s + r.avgScore, 0) / recaps.length) : 0}%`} />
            <MiniStat icon={Trophy} label="Best Score" value={`${recaps.length ? Math.max(...recaps.map(r => r.bestScore)) : 0}%`} />
            <MiniStat icon={Clock} label="Season Aktif" value={`${recaps.length} bulan`} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Belajar 12 bulan penuh untuk raih sertifikat yang bisa di-flex di sosmed!
          </p>
        </CardContent>
      </Card>

      {/* Monthly History */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat Bulanan</CardTitle>
        </CardHeader>
        <CardContent>
          {recaps.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Calendar className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Belum ada rekap bulanan</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Main game kompetisi setiap hari!</p>
              <Button variant="ghost" size="sm" className="mt-3 gap-1" onClick={() => setActiveTab('game')}>
                Mulai Main <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recaps.map((r) => {
                const topics = JSON.parse(r.topicsCovered || '[]') as string[];
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatMonth(r.yearMonth)}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {topics.slice(0, 3).map(t => (
                          <Badge key={t} variant="outline" className="text-[10px] px-1.5">{t}</Badge>
                        ))}
                        {topics.length > 3 && <Badge variant="outline" className="text-[10px] px-1.5">+{topics.length - 3}</Badge>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-600">+{r.totalXP} XP</p>
                      <p className="text-[10px] text-muted-foreground">{r.totalDays} hari</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: string; color: string; bg: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className={cn_p2(bg, 'p-3')}>
        <Icon className={cn_p2('h-4 w-4', color)} />
        <p className="mt-1 text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1 text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function cn_p2(...args: string[]) { return args.join(' '); }

function formatMonth(ym: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const [y, m] = ym.split('-');
  return `${months[parseInt(m) - 1]} ${y}`;
}
