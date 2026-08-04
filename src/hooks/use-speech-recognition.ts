'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';

const RECONNECT_INTERVAL = 15000; // Try reconnecting to Web Speech every 15s
const GROQ_CHUNK_INTERVAL = 4000; // Send audio to Groq every 4s

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function useSpeechRecognition() {
  const {
    sttStatus,
    setSttStatus,
    sttSource,
    setSttSource,
    transcript,
    setTranscript,
    appendTranscript,
    interimTranscript,
    setInterimTranscript,
    setSttError,
    isReconnecting,
    setIsReconnecting,
    apiKeys,
  } = useAppStore();

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groqTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStoppingRef = useRef(false);
  const manualStopRef = useRef(false);
  const [webspeechSupported, setWebspeechSupported] = useState(false);

  // Check Web Speech API support
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setWebspeechSupported(supported);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (groqTimerRef.current) {
      clearInterval(groqTimerRef.current);
      groqTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
  }, []);

  // Send audio to Groq Whisper API
  const sendAudioToGroq = useCallback(async (audioBlob: Blob) => {
    if (!apiKeys.groq) {
      console.warn('Groq API key not set');
      return null;
    }
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'id');
      formData.append('response_format', 'text');

      const res = await fetch('/api/stt/groq', {
        method: 'POST',
        headers: {
          'x-groq-api-key': apiKeys.groq,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      return data.text as string;
    } catch (e) {
      console.error('Groq STT error:', e);
      return null;
    }
  }, [apiKeys.groq]);

  // Start Groq fallback recording
  const startGroqFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000); // Collect chunks every second
      setSttSource('groq');

      // Periodically send audio to Groq
      groqTimerRef.current = setInterval(async () => {
        if (audioChunksRef.current.length === 0) return;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        const text = await sendAudioToGroq(blob);
        if (text && text.trim()) {
          appendTranscript(text.trim());
        }
      }, GROQ_CHUNK_INTERVAL);

      // Try to reconnect to Web Speech API periodically
      const tryReconnect = async () => {
        if (manualStopRef.current || isStoppingRef.current) return;
        setIsReconnecting(true);
        console.log('Attempting to reconnect to Web Speech API...');

        const success = await tryStartWebSpeech(true);
        if (success) {
          // Switched back to Web Speech API
          if (groqTimerRef.current) {
            clearInterval(groqTimerRef.current);
            groqTimerRef.current = null;
          }
          // Send remaining audio before stopping MediaRecorder
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];
            const text = await sendAudioToGroq(blob);
            if (text && text.trim()) {
              appendTranscript(text.trim());
            }
          }
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }
          setIsReconnecting(false);
        } else {
          setIsReconnecting(false);
          // Schedule next reconnection attempt
          if (!manualStopRef.current) {
            reconnectTimerRef.current = setTimeout(tryReconnect, RECONNECT_INTERVAL);
          }
        }
      };

      // Start reconnection attempts after first chunk interval
      reconnectTimerRef.current = setTimeout(tryReconnect, RECONNECT_INTERVAL);
    } catch (e) {
      console.error('Failed to start Groq fallback:', e);
      setSttError('Gagal mengakses mikrofon');
      setSttStatus('error');
    }
  }, [sendAudioToGroq, setSttSource, appendTranscript, setSttError, setSttStatus, setIsReconnecting]);

  // Try to start Web Speech API (returns true if successful)
  const tryStartWebSpeech = useCallback(
    (isReconnectAttempt = false): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!webspeechSupported) {
          resolve(false);
          return;
        }

        const SpeechRecognitionCtor =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
          resolve(false);
          return;
        }

        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID';

        let resolved = false;
        let started = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { recognition.abort(); } catch {}
            resolve(false);
          }
        }, 5000); // 5s timeout to confirm it starts

        recognition.onstart = () => {
          started = true;
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            recognitionRef.current = recognition;
            if (!isReconnectAttempt) {
              setSttSource('webspeech');
            }
            resolve(true);
          }
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let finalText = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript;
            } else {
              interim += result[0].transcript;
            }
          }

          if (finalText) {
            appendTranscript(finalText);
          }
          setInterimTranscript(interim);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('Web Speech API error:', event.error);
          clearTimeout(timeout);

          if (event.error === 'not-allowed') {
            if (!resolved) {
              resolved = true;
              resolve(false);
            }
            setSttError('Akses mikrofon ditolak');
            setSttStatus('error');
            return;
          }

          // Network/connection errors -> fallback to Groq
          if (
            event.error === 'network' ||
            event.error === 'service-not-available' ||
            event.error === 'audio-capture' ||
            event.error === 'aborted'
          ) {
            if (!resolved) {
              resolved = true;
              resolve(false);
            } else if (started && !manualStopRef.current && !isStoppingRef.current) {
              // Was working, now lost connection -> fallback
              console.log('Web Speech API connection lost, switching to Groq fallback');
              startGroqFallback();
            }
          }
        };

        recognition.onend = () => {
          clearTimeout(timeout);
          // If it ended unexpectedly and we're not stopping manually, try to restart or fallback
          if (!manualStopRef.current && !isStoppingRef.current && sttStatus === 'recording') {
            console.log('Web Speech API ended unexpectedly, attempting fallback...');
            startGroqFallback();
          }
        };

        try {
          recognition.start();
        } catch {
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }
      });
    },
    [webspeechSupported, setSttSource, appendTranscript, setInterimTranscript, setSttError, setSttStatus, startGroqFallback, sttStatus]
  );

  const startRecording = useCallback(async () => {
    isStoppingRef.current = false;
    manualStopRef.current = false;
    setSttError('');
    setSttStatus('recording');
    setInterimTranscript('');

    // Try Web Speech API first
    if (webspeechSupported) {
      const success = await tryStartWebSpeech();
      if (success) return;
      console.log('Web Speech API failed to start, using Groq fallback');
    }

    // Fallback to Groq
    if (apiKeys.groq) {
      await startGroqFallback();
    } else {
      setSttError(
        webspeechSupported
          ? 'Web Speech API gagal. Masukkan Groq API key di Settings untuk fallback.'
          : 'Browser tidak mendukung Web Speech API. Masukkan Groq API key di Settings.'
      );
      setSttStatus('error');
    }
  }, [webspeechSupported, tryStartWebSpeech, startGroqFallback, apiKeys.groq, setSttError, setSttStatus, setInterimTranscript]);

  const stopRecording = useCallback(async () => {
    isStoppingRef.current = true;
    manualStopRef.current = true;
    setSttStatus('idle');
    setInterimTranscript('');
    setIsReconnecting(false);

    // Clear timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (groqTimerRef.current) {
      clearInterval(groqTimerRef.current);
      groqTimerRef.current = null;
    }

    // Send remaining Groq audio
    if (sttSource === 'groq' && audioChunksRef.current.length > 0) {
      setSttStatus('processing');
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];
      const text = await sendAudioToGroq(blob);
      if (text && text.trim()) {
        appendTranscript(text.trim());
      }
      setSttStatus('idle');
    }

    // Stop Web Speech
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, [sttSource, sendAudioToGroq, appendTranscript, setSttStatus, setInterimTranscript, setIsReconnecting]);

  const toggleRecording = useCallback(() => {
    if (sttStatus === 'recording' || sttStatus === 'processing') {
      stopRecording();
    } else {
      startRecording();
    }
  }, [sttStatus, startRecording, stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, [setTranscript, setInterimTranscript]);

  return {
 sttStatus,
    sttSource,
    transcript,
    interimTranscript,
    sttError: useAppStore((s) => s.sttError),
    isReconnecting,
    webspeechSupported,
    toggleRecording,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
