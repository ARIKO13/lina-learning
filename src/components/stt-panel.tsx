'use client';

import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function STTPanel() {
  const {
    sttStatus,
    sttSource,
    transcript,
    interimTranscript,
    sttError,
    isReconnecting,
    webspeechSupported,
    toggleRecording,
    clearTranscript,
  } = useSpeechRecognition();

  const isRecording = sttStatus === 'recording';
  const isProcessing = sttStatus === 'processing';

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Speech to Text</CardTitle>
          <div className="flex items-center gap-2">
            {/* Connection Status Badge */}
            <Badge
              variant={sttSource === 'webspeech' ? 'default' : 'secondary'}
              className={cn(
                'gap-1.5 text-xs',
                sttSource === 'webspeech'
                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200'
                  : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200'
              )}
            >
              {sttSource === 'webspeech' ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <Radio className="h-3 w-3" />
              )}
              {sttSource === 'webspeech' ? 'Web Speech API' : 'Groq Fallback'}
            </Badge>

            {isReconnecting && (
              <Badge variant="outline" className="gap-1 text-xs animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Reconnecting...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Browser Support Warning */}
        {!webspeechSupported && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Browser ini tidak mendukung Web Speech API. Groq API akan digunakan sebagai fallback.
              Pastikan API key Groq sudah diatur di Settings.
            </span>
          </div>
        )}

        {/* Error Display */}
        {sttError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sttError}</span>
          </div>
        )}

        {/* Transcript Area */}
        <div className="relative min-h-[200px] rounded-lg border bg-muted/30 p-4">
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {transcript ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {isRecording
                    ? 'Mulai berbicara...'
                    : 'Klik tombol mikrofon untuk mulai merekam'}
                </p>
              )}
              {interimTranscript && (
                <p className="text-sm text-muted-foreground italic">
                  {interimTranscript}
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-medium text-red-500">REC</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={toggleRecording}
            disabled={isProcessing}
            size="lg"
            className={cn(
              'flex-1 gap-2 transition-all',
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {isProcessing ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            {isProcessing
              ? 'Memproses...'
              : isRecording
                ? 'Stop Recording'
                : 'Start Recording'}
          </Button>

          {transcript && (
            <Button
              onClick={clearTranscript}
              disabled={isRecording || isProcessing}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {sttSource === 'webspeech' ? (
              <Wifi className="h-3 w-3 text-emerald-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-amber-500" />
            )}
            <span>
              {isRecording
                ? sttSource === 'webspeech'
                  ? 'Terhubung ke Web Speech API'
                  : 'Menggunakan Groq Whisper API'
                : transcript
                  ? `${transcript.length} karakter`
                  : 'Siap merekam'}
            </span>
          </div>
          {sttSource === 'groq' && isRecording && !isReconnecting && (
            <span className="text-amber-500">Auto-reconnect aktif</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
