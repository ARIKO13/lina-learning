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
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'groq-llama-3.3-70b'
  | 'groq-deepseek-r1-distill-llama-70b'
  | 'cf-glm-4'
  | 'cf-kimi-k2'
  | 'cf-gemma-3-27b';

export interface ModelInfo {
  id: AIModel;
  name: string;
  provider: 'gemini' | 'groq' | 'cloudflare';
}

export const MODEL_LIST: ModelInfo[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'groq-llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'groq' },
  { id: 'groq-deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', provider: 'groq' },
  { id: 'cf-glm-4', name: 'GLM-4', provider: 'cloudflare' },
  { id: 'cf-kimi-k2', name: 'Kimi K2', provider: 'cloudflare' },
  { id: 'cf-gemma-3-27b', name: 'Gemma 3 27B', provider: 'cloudflare' },
];

export interface ApiKeys {
  groq: string;
  gemini: string;
  cloudflare: string;
  cloudflareAccountId: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameResult {
  score: number;
  correctCount: number;
  total: number;
  xpEarned: number;
  streak: number;
  newLevel: number;
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

  // API Keys
  apiKeys: ApiKeys;
  setApiKeys: (keys: Partial<ApiKeys>) => void;

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

      // API Keys
      apiKeys: { groq: '', gemini: '', cloudflare: '', cloudflareAccountId: '' },
      setApiKeys: (keys) => set((s) => ({ apiKeys: { ...s.apiKeys, ...keys } })),

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
      selectedModel: 'gemini-2.5-flash',
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      isAiLoading: false,
      setIsAiLoading: (isAiLoading) => set({ isAiLoading }),

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
      name: 'arushiko-stt-v2',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        selectedModel: state.selectedModel,
        user: state.user,
      }),
    }
  )
);
