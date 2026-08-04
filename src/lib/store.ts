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
export type OutputMode = 'pdf' | 'game' | null;

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
  description: string;
}

export const MODEL_LIST: ModelInfo[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', description: 'Google Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini', description: 'Google Gemini 2.5 Pro' },
  { id: 'groq-llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'groq', description: 'Groq Llama 3.3 70B' },
  { id: 'groq-deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', provider: 'groq', description: 'Groq DeepSeek R1 Distill' },
  { id: 'cf-glm-4', name: 'GLM-4', provider: 'cloudflare', description: 'Cloudflare GLM-4' },
  { id: 'cf-kimi-k2', name: 'Kimi K2', provider: 'cloudflare', description: 'Cloudflare Kimi K2' },
  { id: 'cf-gemma-3-27b', name: 'Gemma 3 27B', provider: 'cloudflare', description: 'Cloudflare Gemma 3 27B' },
];

export interface ApiKeys {
  groq: string;
  gemini: string;
  cloudflare: string;
  cloudflareAccountId: string;
}

interface AppState {
  // API Keys
  apiKeys: ApiKeys;
  setApiKeys: (keys: Partial<ApiKeys>) => void;

  // STT
  sttStatus: STTStatus;
  setSttStatus: (status: STTStatus) => void;
  sttSource: STTSource;
  setSttSource: (source: STTSource) => void;
  transcript: string;
  setTranscript: (text: string) => void;
  appendTranscript: (text: string) => void;
  interimTranscript: string;
  setInterimTranscript: (text: string) => void;
  sttError: string;
  setSttError: (error: string) => void;
  isReconnecting: boolean;
  setIsReconnecting: (v: boolean) => void;

  // Output Mode
  selectedMode: OutputMode;
  setSelectedMode: (mode: OutputMode) => void;
  generatedContent: string;
  setGeneratedContent: (content: string) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;

  // AI Chat
  aiMessages: ChatMessage[];
  addAiMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearAiMessages: () => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  isAiLoading: boolean;
  setIsAiLoading: (v: boolean) => void;

  // UI
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  activeTab: 'stt' | 'output' | 'assistant';
  setActiveTab: (tab: 'stt' | 'output' | 'assistant') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // API Keys
      apiKeys: {
        groq: '',
        gemini: '',
        cloudflare: '',
        cloudflareAccountId: '',
      },
      setApiKeys: (keys) =>
        set((state) => ({ apiKeys: { ...state.apiKeys, ...keys } })),

      // STT
      sttStatus: 'idle',
      setSttStatus: (sttStatus) => set({ sttStatus }),
      sttSource: 'webspeech',
      setSttSource: (sttSource) => set({ sttSource }),
      transcript: '',
      setTranscript: (transcript) => set({ transcript }),
      appendTranscript: (text) =>
        set((state) => ({ transcript: state.transcript + ' ' + text })),
      interimTranscript: '',
      setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
      sttError: '',
      setSttError: (sttError) => set({ sttError }),
      isReconnecting: false,
      setIsReconnecting: (isReconnecting) => set({ isReconnecting }),

      // Output Mode
      selectedMode: null,
      setSelectedMode: (selectedMode) => set({ selectedMode }),
      generatedContent: '',
      setGeneratedContent: (generatedContent) => set({ generatedContent }),
      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),

      // AI Chat
      aiMessages: [],
      addAiMessage: (msg) =>
        set((state) => ({
          aiMessages: [
            ...state.aiMessages,
            { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
          ],
        })),
      clearAiMessages: () => set({ aiMessages: [] }),
      selectedModel: 'gemini-2.5-flash',
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      isAiLoading: false,
      setIsAiLoading: (isAiLoading) => set({ isAiLoading }),

      // UI
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      activeTab: 'stt',
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    {
      name: 'arushiko-stt-app',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        selectedModel: state.selectedModel,
        aiMessages: state.aiMessages,
        transcript: state.transcript,
      }),
    }
  )
);
