'use client';

import { useAppStore, MODEL_LIST, type QuizQuestion } from '@/lib/store';
import { getTierForXP, getXPProgress, getXPToNextTier, TIERS } from '@/lib/tiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Play, CheckCircle2, XCircle, ArrowRight, Trophy, Zap, Flame, Star,
  RotateCcw, Sparkles, Timer, Target, Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
};

const DIFFICULTY_XP = { easy: 10, medium: 20, hard: 30 };

export function GamePanel() {
  const {
    user, transcript, apiKeys, selectedModel,
    quizQuestions, setQuizQuestions, currentQuestionIdx, setCurrentQuestionIdx,
    selectedAnswers, setSelectedAnswer, gamePhase, setGamePhase,
    gameResult, setGameResult, isGeneratingQuiz, setIsGeneratingQuiz,
    quizTopic, setQuizTopic, userStats, setUserStats,
  } = useAppStore();

  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/progress/stats?userId=${user.id}`).then(r => r.json()).then(setUserStats);
  }, [user, setUserStats]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [gamePhase, startTime]);

  const startQuiz = useCallback(async () => {
    if (!transcript.trim()) { toast.error('Transkrip dulu di tab Speech to Text!'); return; }
    if (!user) return;
    setIsGeneratingQuiz(true);
    setGamePhase('playing');
    setSelectedAnswer([]); setCurrentQuestionIdx(0); setStartTime(Date.now()); setElapsed(0);
    try {
      const res = await fetch('/api/game/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, apiKey: apiKeys, model: selectedModel }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuizQuestions(data.questions); setQuizTopic(data.topic);
      toast.success(`${data.questions.length} soal dari: ${data.topic}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal generate quiz');
      setGamePhase('idle');
    } finally { setIsGeneratingQuiz(false); }
  }, [transcript, user, apiKeys, selectedModel, setIsGeneratingQuiz, setGamePhase, setSelectedAnswer, setCurrentQuestionIdx, setQuizQuestions, setQuizTopic]);

  const submitQuiz = useCallback(async () => {
    if (!user || quizQuestions.length === 0) return;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    try {
      const res = await fetch('/api/game/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, answers: selectedAnswers, questions: quizQuestions, topic: quizTopic, timeSpentSeconds: timeSpent }),
      });
      const data = await res.json(); if (data.error) throw new Error(data.error);
      setGameResult(data); setGamePhase('result');
      fetch(`/api/progress/stats?userId=${user.id}`).then(r => r.json()).then(setUserStats);
      if (data.tierUp) {
        toast.success(`${data.newTier.emoji} TIER UP! Sekarang ${data.newTier.emoji} ${data.newTier.name}!`);
      } else if (data.score === 100) {
        toast.success('PERFECT SCORE! +50 bonus XP!');
      } else if (data.score >= 80) {
        toast.success(`Hebat! Score: ${data.score}%`);
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal submit'); }
  }, [user, quizQuestions, selectedAnswers, quizTopic, startTime, setGameResult, setGamePhase, setUserStats]);

  const resetGame = () => {
    setGamePhase('idle'); setQuizQuestions([]); setSelectedAnswer([]); setCurrentQuestionIdx(0); setGameResult(null);
  };

  const q = quizQuestions[currentQuestionIdx];
  const stats = userStats;
  const tier = getTierForXP(stats?.xp || 0);
  const nextTier = TIERS.find(t => t.level === tier.level + 1);
  const xpProgress = getXPProgress(stats?.xp || 0, tier);
  const xpToNext = getXPToNextTier(stats?.xp || 0, tier);
  const answeredCount = selectedAnswers.filter(a => a !== null && a !== undefined).length;

  return (
    <div className="space-y-4">
      {/* Player Stats Bar */}
      <Card className="border border-[#E5E5E5] bg-white shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {user?.image ? (
                <img src={user.image} className="h-9 w-9 rounded-full" alt="" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E85D25] text-white font-bold text-sm">{user?.name?.[0] || '?'}</div>
              )}
              <div>
                <p className="text-sm font-semibold leading-tight text-[#111111]">{user?.name || 'Player'}</p>
                <p className="text-[10px] text-[#999999]">{tier.emoji} {tier.name} <span className="text-[#999999]/60">{tier.exclusivity}</span></p>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap gap-2 ml-auto">
              <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 dark:bg-amber-950/30">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{(stats?.xp || 0).toLocaleString()} XP</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 dark:bg-orange-950/30">
                <Flame className="h-3.5 w-3.5 text-[#E85D25]" />
                <span className="text-xs font-bold text-[#E85D25]">{stats?.streak || 0} streak</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 dark:bg-violet-950/30">
                <Crown className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-bold text-violet-700 dark:text-violet-400">S{stats?.currentSeason || 1}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-[#999999]">
              <span>{tier.emoji} {tier.name}</span>
              <span>{nextTier ? `${nextTier.emoji} ${nextTier.name} (${xpToNext.toLocaleString()} XP lagi)` : 'MAX TIER'}</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {gamePhase === 'idle' && (
        <Card className="border border-[#E5E5E5] bg-white shadow-none">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-orange-50 p-4"><Play className="h-8 w-8 text-[#E85D25]" /></div>
            <h3 className="mt-4 text-lg font-semibold text-[#111111]">Game Kompetisi</h3>
            <p className="mt-1 max-w-sm text-sm text-[#666666]">
              {transcript ? `Transkrip siap! (${transcript.length} karakter). Mulai quiz dari materi kamu.` : 'Transkrip audio dulu di tab Speech to Text, lalu mainkan quiz dari materimu!'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="gap-1 text-xs border-[#E5E5E5] text-[#666666]"><Zap className="h-3 w-3" />Easy +10 XP</Badge>
              <Badge variant="outline" className="gap-1 text-xs border-[#E5E5E5] text-[#666666]"><Star className="h-3 w-3" />Medium +20 XP</Badge>
              <Badge variant="outline" className="gap-1 text-xs border-[#E5E5E5] text-[#666666]"><Flame className="h-3 w-3" />Hard +30 XP</Badge>
            </div>
            <Button onClick={startQuiz} disabled={!transcript || isGeneratingQuiz} className="mt-6 gap-2 bg-[#E85D25] hover:bg-[#D14E1C] rounded-full text-white" size="lg">
              {isGeneratingQuiz ? (<><RotateCcw className="h-4 w-4 animate-spin" /> Generating Quiz...</>) : (<><Play className="h-4 w-4" /> Mulai Quiz</>)}
            </Button>
          </CardContent>
        </Card>
      )}

      {gamePhase === 'playing' && q && (
        <Card className="border border-[#E5E5E5] bg-white shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs', DIFFICULTY_COLORS[q.difficulty])}>{q.difficulty.toUpperCase()} +{DIFFICULTY_XP[q.difficulty]} XP</Badge>
                {quizTopic && <Badge variant="outline" className="text-xs border-[#E5E5E5] text-[#666666]">{quizTopic}</Badge>}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#999999]">
                <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{elapsed}s</span>
                <span>{currentQuestionIdx + 1}/{quizQuestions.length}</span>
              </div>
            </div>
            <Progress value={((currentQuestionIdx + 1) / quizQuestions.length) * 100} className="mt-2 h-1.5" />
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-base font-semibold leading-relaxed text-[#111111]">{q.question}</h3>
            <div className="grid gap-2">
              {q.options.map((opt, i) => {
                const selected = selectedAnswers[currentQuestionIdx];
                const isSelected = selected === i;
                return (
                  <button key={i} onClick={() => setSelectedAnswer(currentQuestionIdx, i)} className={cn('flex items-center gap-3 rounded-lg border p-3.5 text-left text-sm transition-all', isSelected ? 'border-[#E85D25] bg-orange-50 dark:bg-orange-950/30' : 'border-[#E5E5E5] hover:border-[#999999]')}>
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-bold transition-colors', isSelected ? 'border-[#E85D25] bg-[#E85D25] text-white' : 'border-[#E5E5E5] text-[#666666]')}>{String.fromCharCode(65 + i)}</span>
                    <span className="text-[#111111]">{opt}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))} disabled={currentQuestionIdx === 0} className="gap-1 text-[#666666]">Sebelumnya</Button>
              {currentQuestionIdx < quizQuestions.length - 1 ? (
                <Button onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)} disabled={selectedAnswers[currentQuestionIdx] === null || selectedAnswers[currentQuestionIdx] === undefined} className="gap-1 bg-[#E85D25] hover:bg-[#D14E1C] text-white rounded-full">Selanjutnya <ArrowRight className="h-3.5 w-3.5" /></Button>
              ) : (
                <Button onClick={submitQuiz} disabled={answeredCount < quizQuestions.length} className="gap-1 bg-[#E85D25] hover:bg-[#D14E1C] text-white rounded-full"><Trophy className="h-3.5 w-3.5" /> Submit ({answeredCount}/{quizQuestions.length})</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {gamePhase === 'result' && gameResult && (
        <Card className="border border-[#E5E5E5] bg-white shadow-none">
          <CardContent className="space-y-5 py-6">
            {gameResult.tierUp && (
              <div className="text-center py-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-medium text-amber-700">TIER UP!</p>
                <p className="text-2xl font-bold mt-1 text-[#111111]">
                  {gameResult.prevTier?.emoji} {gameResult.prevTier?.name}
                  <ArrowRight className="inline h-5 w-5 mx-2 text-[#E85D25]" />
                  {gameResult.newTier?.emoji} {gameResult.newTier?.name}
                </p>
                <p className="text-[11px] text-amber-600 mt-1">{gameResult.newTier?.exclusivity}</p>
              </div>
            )}

            <div className="flex flex-col items-center">
              <div className={cn('flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white', gameResult.score >= 80 ? 'bg-[#E85D25]' : gameResult.score >= 50 ? 'bg-amber-500' : 'bg-red-500')}>
                {gameResult.score}%
              </div>
              <p className="mt-2 text-lg font-semibold text-[#111111]">{gameResult.score === 100 ? 'PERFECT!' : gameResult.score >= 80 ? 'Hebat!' : gameResult.score >= 50 ? 'Lumayan!' : 'Ayo coba lagi!'}</p>
              <p className="text-sm text-[#999999]">{gameResult.correctCount}/{gameResult.total} jawaban benar</p>
            </div>

            <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-2">
              <h4 className="text-sm font-semibold text-[#111111]">XP Earned</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-[#666666]">Base XP</span><span className="font-semibold text-[#111111]">+{gameResult.xpEarned - gameResult.perfectBonus - gameResult.streakBonus}</span></div>
                {gameResult.perfectBonus > 0 && <div className="flex justify-between text-sm"><span className="text-amber-600">Perfect Bonus</span><span className="font-semibold text-amber-600">+{gameResult.perfectBonus}</span></div>}
                {gameResult.streakBonus > 0 && <div className="flex justify-between text-sm"><span className="text-[#E85D25]">Streak Bonus ({gameResult.streak} days)</span><span className="font-semibold text-[#E85D25]">+{gameResult.streakBonus}</span></div>}
                <div className="border-t border-[#E5E5E5] pt-1.5 flex justify-between text-sm font-bold"><span className="text-[#111111]">Total</span><span className="text-[#E85D25]">+{gameResult.xpEarned} XP</span></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-[#E5E5E5] p-3"><p className="text-lg font-bold text-[#111111]">{gameResult.totalXP.toLocaleString()}</p><p className="text-[10px] text-[#999999]">Total XP</p></div>
              <div className="rounded-lg border border-[#E5E5E5] p-3"><p className="text-lg font-bold text-[#111111]">{gameResult.newTier?.emoji}</p><p className="text-[10px] text-[#999999]">{gameResult.newTier?.name}</p></div>
              <div className="rounded-lg border border-[#E5E5E5] p-3"><p className="text-lg font-bold text-[#111111]">{gameResult.streak}</p><p className="text-[10px] text-[#999999]">Day Streak</p></div>
            </div>

            <details className="rounded-lg border border-[#E5E5E5]"><summary className="cursor-pointer p-3 text-sm font-medium text-[#111111] hover:bg-[#FAFAFA]">Lihat Jawaban & Penjelasan</summary>
              <div className="border-t border-[#E5E5E5] p-3 space-y-3 max-h-64 overflow-y-auto">
                {quizQuestions.map((qq, i) => {
                  const userAns = selectedAnswers[i]; const isCorrect = userAns === qq.correctIndex;
                  return (<div key={i} className="space-y-1"><div className="flex items-start gap-2">{isCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}<div><p className="text-xs font-medium text-[#111111]">Q{i + 1}: {qq.question}</p><p className="text-[11px] text-[#999999]">Jawabanmu: {userAns !== null && userAns !== undefined ? qq.options[userAns] : '-'}{!isCorrect && ` | Benar: ${qq.options[qq.correctIndex]}`}</p><p className="text-[11px] text-green-600 mt-0.5">{qq.explanation}</p></div></div></div>);
                })}
              </div>
            </details>

            <div className="flex gap-2">
              <Button onClick={resetGame} variant="outline" className="flex-1 gap-1 border-[#E5E5E5] text-[#666666]"><RotateCcw className="h-3.5 w-3.5" /> Main Lagi</Button>
              <Button onClick={() => useAppStore.getState().setActiveTab('dashboard')} variant="outline" className="flex-1 gap-1 border-[#E5E5E5] text-[#666666]"><Sparkles className="h-3.5 w-3.5" /> Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
