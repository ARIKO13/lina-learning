'use client';

import { useAppStore } from '@/lib/store';
import { getTierForXP, getXPProgress, getXPToNextTier, TIERS } from '@/lib/tiers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Zap, Flame, Target, Calendar, Trophy, Award, TrendingUp, BookOpen, Clock, ArrowRight, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MonthlyRecap {
  id: string; yearMonth: string; totalXP: number; totalDays: number; avgScore: number; bestScore: number; topicsCovered: string; level: number;
}

interface CertificateData {
  id: string; season: number; year: string; totalXP: number; totalDays: number; maxLevel: number; maxStreak: number; awardedAt: string; expiresAt: string; shareCode: string; daysUntilExpiry: number;
}

export function DashboardPanel() {
  const { user, userStats, setUserStats, setShowCertificate, setActiveTab } = useAppStore();
  const [recaps, setRecaps] = useState<MonthlyRecap[]>([]);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/progress/stats?userId=${user.id}`).then(r => r.json()).then(setUserStats);
    fetch(`/api/progress/recap?userId=${user.id}`).then(r => r.json()).then(d => setRecaps(d.recaps || []));
    fetch(`/api/progress/certificate?userId=${user.id}`).then(r => r.json()).then(d => { if (!d.error) setCertificate(d); });
  }, [user, setUserStats]);

  const stats = userStats;
  const tier = getTierForXP(stats?.xp || 0);
  const nextTier = TIERS.find(t => t.level === tier.level + 1);
  const xpProgress = getXPProgress(stats?.xp || 0, tier);
  const xpToNext = getXPToNextTier(stats?.xp || 0, tier);

  return (
    <div className="space-y-4">
      {certificate && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E85D25]"><Award className="h-6 w-6 text-white" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Sertifikat Season {certificate.season} Tersedia!</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{certificate.daysUntilExpiry} hari lagi sebelum dihapus. Flex di sosmed sekarang!</p>
            </div>
            <Button size="sm" className="gap-1 bg-[#E85D25] hover:bg-[#D14E1C] text-white rounded-full" onClick={() => setShowCertificate(true)}><Trophy className="h-3.5 w-3.5" /> Lihat</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Zap} label="Total XP" value={(stats?.xp || 0).toLocaleString()} color="text-[#E85D25]" bg="bg-orange-50 dark:bg-orange-950/30" />
        <StatCard icon={Target} label="Tier" value={`${tier.emoji} ${tier.name}`} color="text-violet-600" bg="bg-violet-50 dark:bg-violet-950/30" />
        <StatCard icon={Flame} label="Streak" value={`${stats?.streak || 0} hari`} color="text-[#E85D25]" bg="bg-orange-50 dark:bg-orange-950/30" />
        <StatCard icon={Calendar} label="Bulan Ini" value={`${stats?.monthlyDays || 0} hari`} color="text-sky-600" bg="bg-sky-50 dark:bg-sky-950/30" />
      </div>

      <Card className="border border-[#E5E5E5] bg-white shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-base text-[#111111]">Tier Progress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><span className="text-xl">{tier.emoji}</span><div><p className="text-sm font-bold text-[#111111]">{tier.name}</p><p className="text-[10px] text-[#999999]">{tier.exclusivity}</p></div></div>
            {nextTier && <div className="text-right"><p className="text-sm font-bold text-[#111111]">{nextTier.emoji} {nextTier.name}</p><p className="text-[10px] text-[#E85D25]">{xpToNext.toLocaleString()} XP lagi</p></div>}
          </div>
          <Progress value={xpProgress} className="h-2.5" />
          <p className="text-[10px] text-[#999999]">{(stats?.xp || 0).toLocaleString()} / {(tier.xpRequired + tier.xpToNext).toLocaleString()} XP</p>
        </CardContent>
      </Card>

      <Card className="border border-[#E5E5E5] bg-white shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-base text-[#111111]">Season {stats?.currentSeason || 1} Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat icon={BookOpen} label="Topik" value={`${recaps.reduce((s, r) => s + (JSON.parse(r.topicsCovered || '[]') as string[]).length, 0)}`} />
            <MiniStat icon={TrendingUp} label="Avg Score" value={`${recaps.length ? Math.round(recaps.reduce((s, r) => s + r.avgScore, 0) / recaps.length) : 0}%`} />
            <MiniStat icon={Trophy} label="Best Score" value={`${recaps.length ? Math.max(...recaps.map(r => r.bestScore)) : 0}%`} />
            <MiniStat icon={Crown} label="Season" value={`${recaps.length} bulan`} />
          </div>
          <p className="mt-3 text-[11px] text-[#999999]">Belajar 12 bulan penuh untuk raih sertifikat yang bisa di-flex di sosmed!</p>
        </CardContent>
      </Card>

      <Card className="border border-[#E5E5E5] bg-white shadow-none">
        <CardHeader className="pb-3"><CardTitle className="text-base text-[#111111]">Riwayat Bulanan</CardTitle></CardHeader>
        <CardContent>
          {recaps.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Calendar className="mb-2 h-8 w-8 text-[#E5E5E5]" />
              <p className="text-sm text-[#999999]">Belum ada rekap bulanan</p>
              <Button variant="ghost" size="sm" className="mt-3 gap-1 text-[#E85D25]" onClick={() => setActiveTab('game')}>Mulai Main <ArrowRight className="h-3 w-3" /></Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recaps.map((r) => {
                const topics = JSON.parse(r.topicsCovered || '[]') as string[];
                return (<div key={r.id} className="flex items-center gap-3 rounded-lg border border-[#E5E5E5] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30"><Calendar className="h-5 w-5 text-[#E85D25]" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111111]">{formatMonth(r.yearMonth)}</p>
                    <div className="flex flex-wrap gap-1 mt-1">{topics.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[10px] px-1.5 border-[#E5E5E5] text-[#666666]">{t}</Badge>)}{topics.length > 3 && <Badge variant="outline" className="text-[10px] px-1.5 border-[#E5E5E5] text-[#666666]">+{topics.length - 3}</Badge>}</div>
                  </div>
                  <div className="text-right shrink-0"><p className="text-sm font-bold text-[#E85D25]">+{r.totalXP} XP</p><p className="text-[10px] text-[#999999]">{r.totalDays} hari</p></div>
                </div>);
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: string; color: string; bg: string }) {
  return (<Card className="border border-[#E5E5E5] bg-white shadow-none"><CardContent className={`${bg} p-3`}><Icon className={`h-4 w-4 ${color}`} /><p className="mt-1 text-lg font-bold leading-tight text-[#111111]">{value}</p><p className="text-[10px] text-[#999999]">{label}</p></CardContent></Card>);
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (<div className="rounded-lg border border-[#E5E5E5] p-2.5 text-center"><Icon className="mx-auto h-4 w-4 text-[#999999]" /><p className="mt-1 text-sm font-bold text-[#111111]">{value}</p><p className="text-[10px] text-[#999999]">{label}</p></div>);
}

function formatMonth(ym: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const [y, m] = ym.split('-');
  return `${months[parseInt(m) - 1]} ${y}`;
}
