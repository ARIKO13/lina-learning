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
  FileText,
  Loader2,
  Download,
  Palette,
  Zap,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

type PDFMethod = 'playwright' | 'weasyprint' | 'jspdf';

const PDF_METHODS: { id: PDFMethod; label: string; desc: string; emoji: string; color: string }[] = [
  { id: 'playwright', label: 'Playwright', desc: 'Kualitas terbaik, full CSS + cover page', emoji: '𝚟', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
  { id: 'weasyprint', label: 'WeasyPrint', desc: 'Ringan, tanpa Chromium', emoji: '𝚞', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
  { id: 'jspdf', label: 'jsPDF', desc: 'Instant di browser, tanpa server', emoji: '𝚟', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
];

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

  const [pdfLoading, setPdfLoading] = useState(false);
  const isRecording = sttStatus === 'recording';
  const isProcessing = sttStatus === 'processing';

  const generatePDF = async (method: PDFMethod) => {
    if (!transcript.trim()) {
      toast.error('Transkrip kosong! Rekam dulu.');
      return;
    }

    setPdfLoading(true);
    try {
      if (method === 'jspdf') {
        // Method 3: Get JSON data, generate in browser
        const res = await fetch('/api/pdf/jspdf-data?XTransformPort=3030', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, title: undefined }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        generatePDFBrowser(data);
        toast.success('PDF berhasil di-generate di browser!');
      } else {
        // Method 1 & 2: Server-side PDF generation
        const endpoint = method === 'playwright' ? '/api/pdf/playwright' : '/api/pdf/weasyprint';
        const res = await fetch(`${endpoint}?XTransformPort=3030`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, title: undefined }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal generate PDF');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `modul-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`PDF (${method}) berhasil diunduh!`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Speech to Text</CardTitle>
          <div className="flex items-center gap-2">
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
        {!webspeechSupported && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Browser ini tidak mendukung Web Speech API. Groq API akan digunakan sebagai fallback.</span>
          </div>
        )}
        {sttError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/20 dark:border-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{sttError}</span>
          </div>
        )}

        <div className="relative min-h-[200px] rounded-lg border bg-muted/30 p-4">
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {transcript ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {isRecording ? 'Mulai berbicara...' : 'Klik tombol mikrofon untuk mulai merekam'}
                </p>
              )}
              {interimTranscript && (
                <p className="text-sm text-muted-foreground italic">{interimTranscript}</p>
              )}
            </div>
          </ScrollArea>
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
              isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {isProcessing ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            {isProcessing ? 'Memproses...' : isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
          {transcript && (
            <Button onClick={clearTranscript} disabled={isRecording || isProcessing} variant="outline" size="lg" className="gap-2">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>

        {/* PDF Module Generation */}
        {transcript && (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold">Buat Modul PDF</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{transcript.length} karakter</Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PDF_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => generatePDF(m.id)}
                  disabled={pdfLoading}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border-2 p-3 text-left transition-all hover:shadow-sm disabled:opacity-50',
                    m.color
                  )}
                >
                  {pdfLoading ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                  ) : m.id === 'playwright' ? (
                    <Palette className="h-5 w-5 shrink-0" />
                  ) : m.id === 'weasyprint' ? (
                    <Zap className="h-5 w-5 shrink-0" />
                  ) : (
                    <Monitor className="h-5 w-5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{m.id === 'playwright' ? '𝚟' : m.id === 'weasyprint' ? '𝚞' : '𝚟'} {m.label}</p>
                    <p className="text-[10px] opacity-70 truncate">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
                ? sttSource === 'webspeech' ? 'Terhubung ke Web Speech API' : 'Menggunakan Groq Whisper API'
                : transcript ? `${transcript.length} karakter` : 'Siap merekam'}
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

// jsPDF browser-side generation (Method 3)
function generatePDFBrowser(data: { title: string; subtitle: string; date: string; sections: { title: string; paragraphs: string[] }[]; branding: string }) {
  // Dynamic import jsPDF
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
  script.onload = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = margin;

    const checkPage = () => {
      if (y > pageH - 30) {
        doc.addPage();
        y = margin;
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`${data.branding} - ${data.date}`, pageW / 2, pageH - 10, { align: 'center' });
      }
    };

    // Cover page
    doc.setFillColor(236, 253, 245);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setFontSize(24);
    doc.setTextColor(6, 78, 59);
    doc.text(data.title, pageW / 2, 80, { align: 'center', maxWidth: contentW });
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text(data.subtitle, pageW / 2, 92, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(`Tanggal: ${data.date}`, pageW / 2, 110, { align: 'center' });
    doc.text(`${data.totalParagraphs} paragraf  |  ${data.totalChars} karakter`, pageW / 2, 118, { align: 'center' });
    doc.text(`Dibuat oleh ${data.branding}`, pageW / 2, 130, { align: 'center' });

    // TOC page
    doc.addPage();
    y = margin;
    doc.setFontSize(16);
    doc.setTextColor(5, 150, 105);
    doc.text('Daftar Isi', margin, y);
    y += 12;
    data.sections.forEach((sec, i) => {
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(`${i + 1}. ${sec.title}`, margin + 4, y);
      y += 8;
    });

    // Content pages
    doc.addPage();
    y = margin;
    data.sections.forEach((sec) => {
      checkPage();
      doc.setFontSize(13);
      doc.setTextColor(5, 150, 105);
      doc.text(sec.title, margin, y);
      y += 8;

      // Section underline
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + 40, y);
      y += 6;

      sec.paragraphs.forEach((p) => {
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        const lines = doc.splitTextToSize(p, contentW);
        lines.forEach((line: string) => {
          checkPage();
          doc.text(line, margin, y);
          y += 5;
        });
        y += 3;
      });
      y += 6;
    });

    // Footer on last page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${data.branding} - ${data.date}`, pageW / 2, pageH - 10, { align: 'center' });

    doc.save(`${data.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.pdf`);
  };
  document.head.appendChild(script);
}
