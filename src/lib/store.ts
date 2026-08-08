import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: number;
}

export type STTSource = 'webspeech' | 'groq';
export type STTStatus = 'idle' | 'recording' | 'processing' | 'error';

export type AIModel =
  | 'gemini-3.6-flash'
  | 'claude-sonnet-5'
  | 'deepseek-v4-flash'
  | 'deepseek-v4-pro'
  | 'deepseek-reasoner'
  | 'auto';

export interface ModelInfo {
  id: AIModel;
  name: string;
  provider: 'polyvor';
  gateway: string;
  gatewayModel: string;
}

export const MODEL_LIST: ModelInfo[] = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'polyvor', gateway: 'server3', gatewayModel: 'gemini-3.6-flash' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'polyvor', gateway: 'server3', gatewayModel: 'claude-sonnet-5' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'polyvor', gateway: 'server3', gatewayModel: 'deepseek-v4-flash' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'polyvor', gateway: 'server2', gatewayModel: 'ds/deepseek-v4-pro' },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'polyvor', gateway: 'server2', gatewayModel: 'ds/deepseek-reasoner' },
  { id: 'auto', name: 'Auto (AI Pilih)', provider: 'polyvor', gateway: 'server3', gatewayModel: 'auto' },
];

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

import { TIERS, type Tier } from './tiers';

export interface GameResult {
  score: number;
  correctCount: number;
  total: number;
  xpEarned: number;
  streak: number;
  newTier: Tier;
  prevTier: Tier;
  tierUp: boolean;
  totalXP: number;
  perfectBonus: number;
  streakBonus: number;
}

export interface UserStats {
  id: string;
  xp: number;
  level: number;
  streak: number;
  currentSeason: number;
  playedToday: boolean;
  monthlyDays: number;
  name?: string;
  image?: string | null;
}

interface AppState {
  // Auth
  user: { id: string; email: string; name: string; image?: string | null } | null;
  setUser: (user: AppState['user']) => void;

  // STT
  sttStatus: STTStatus;
  setSttStatus: (s: STTStatus) => void;
  sttSource: STTSource;
  setSttSource: (s: STTSource) => void;
  transcript: string;
  setTranscript: (t: string) => void;
  appendTranscript: (t: string) => void;
  interimTranscript: string;
  setInterimTranscript: (t: string) => void;
  sttError: string;
  setSttError: (e: string) => void;
  isReconnecting: boolean;
  setIsReconnecting: (v: boolean) => void;

  // AI Chat
  aiMessages: ChatMessage[];
  addAiMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearAiMessages: () => void;
  selectedModel: AIModel;
  setSelectedModel: (m: AIModel) => void;
  isAiLoading: boolean;
  setIsAiLoading: (v: boolean) => void;
  scrapeMode: boolean;
  setScrapeMode: (v: boolean) => void;

  // Game
  quizQuestions: QuizQuestion[];
  setQuizQuestions: (q: QuizQuestion[]) => void;
  currentQuestionIdx: number;
  setCurrentQuestionIdx: (i: number) => void;
  selectedAnswers: (number | null)[];
  setSelectedAnswer: (qIdx: number, ans: number) => void;
  gamePhase: 'idle' | 'playing' | 'result';
  setGamePhase: (p: 'idle' | 'playing' | 'result') => void;
  gameResult: GameResult | null;
  setGameResult: (r: GameResult | null) => void;
  isGeneratingQuiz: boolean;
  setIsGeneratingQuiz: (v: boolean) => void;
  quizTopic: string;
  setQuizTopic: (t: string) => void;
  userStats: UserStats | null;
  setUserStats: (s: UserStats | null) => void;
  showCertificate: boolean;
  setShowCertificate: (v: boolean) => void;

  // UI
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  activeTab: 'stt' | 'game' | 'dashboard' | 'assistant';
  setActiveTab: (tab: AppState['activeTab']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // STT
      sttStatus: 'idle',
      setSttStatus: (sttStatus) => set({ sttStatus }),
      sttSource: 'webspeech',
      setSttSource: (sttSource) => set({ sttSource }),
      transcript: '',
      setTranscript: (transcript) => set({ transcript }),
      appendTranscript: (text) => set((s) => ({ transcript: s.transcript + ' ' + text })),
      interimTranscript: '',
      setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
      sttError: '',
      setSttError: (sttError) => set({ sttError }),
      isReconnecting: false,
      setIsReconnecting: (isReconnecting) => set({ isReconnecting }),

      // AI Chat
      aiMessages: [],
      addAiMessage: (msg) => set((s) => ({
        aiMessages: [...s.aiMessages, { ...msg, id: crypto.randomUUID(), timestamp: Date.now() }],
      })),
      clearAiMessages: () => set({ aiMessages: [] }),
      selectedModel: 'gemini-3.6-flash',
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      isAiLoading: false,
      setIsAiLoading: (isAiLoading) => set({ isAiLoading }),
      scrapeMode: false,
      setScrapeMode: (scrapeMode) => set({ scrapeMode }),

      // Game
      quizQuestions: [],
      setQuizQuestions: (quizQuestions) => set({ quizQuestions }),
      currentQuestionIdx: 0,
      setCurrentQuestionIdx: (currentQuestionIdx) => set({ currentQuestionIdx }),
      selectedAnswers: [],
      setSelectedAnswer: (qIdx, ans) => set((s) => {
        const next = [...s.selectedAnswers];
        next[qIdx] = ans;
        return { selectedAnswers: next };
      }),
      gamePhase: 'idle',
      setGamePhase: (gamePhase) => set({ gamePhase }),
      gameResult: null,
      setGameResult: (gameResult) => set({ gameResult }),
      isGeneratingQuiz: false,
      setIsGeneratingQuiz: (isGeneratingQuiz) => set({ isGeneratingQuiz }),
      quizTopic: '',
      setQuizTopic: (quizTopic) => set({ quizTopic }),
      userStats: null,
      setUserStats: (userStats) => set({ userStats }),
      showCertificate: false,
      setShowCertificate: (showCertificate) => set({ showCertificate }),

      // UI
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      activeTab: 'stt',
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    {
      name: 'lina-learning-v1',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        user: state.user,
      }),
    }
  )
);
