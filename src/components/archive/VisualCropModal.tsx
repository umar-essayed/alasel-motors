import React, { useState, useEffect, useRef } from 'react';
import { ArchivedInvoice } from '../../types';
import { parseVoiceInput, VoiceParsedIntent } from '../../utils/speechParsingUtils';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FileText,
  Sparkles,
  ExternalLink,
  Mic,
  MicOff,
  Volume2,
  Check,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface VisualCropModalProps {
  record: ArchivedInvoice | null;
  onClose: () => void;
  onUpdateRecord: (updated: ArchivedInvoice) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const VisualCropModal: React.FC<VisualCropModalProps> = ({
  record,
  onClose,
  onUpdateRecord,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
}) => {
  const [zoom, setZoom] = useState(1);
  const [engineInput, setEngineInput] = useState(record?.engineNumber || '');
  const [customerInput, setCustomerInput] = useState(record?.customerName || '');
  const [trafficInput, setTrafficInput] = useState(record?.trafficDepartment || '');
  const [dateInput, setDateInput] = useState(record?.date || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // MediaRecorder references for 100% reliable local transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Sync state when record changes
  useEffect(() => {
    if (!record) return;
    setEngineInput(record.engineNumber || '');
    setCustomerInput(record.customerName || '');
    setTrafficInput(record.trafficDepartment || '');
    setDateInput(record.date || '');
    setZoom(1);
    setSaveSuccess(false);
    setVoiceTranscript('');
    setVoiceFeedback(null);
  }, [record?.id]);

  if (!record) return null;

  // User confirmed the number is correct -> Clears alternate candidates 2 & 3
  const handleConfirmAndClearAlternates = (autoAdvance: boolean = false) => {
    const updated: ArchivedInvoice = {
      ...record,
      engineNumber: engineInput.trim(),
      customerName: customerInput.trim(),
      trafficDepartment: trafficInput.trim(),
      date: dateInput.trim(),
      candidate2: '',
      candidate3: '',
      isConfirmed: true,
      notes: record.notes ? `${record.notes} (معتمد يدوي/صوتي)` : 'معتمد يدوي/صوتي',
    };
    onUpdateRecord(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    if (autoAdvance && hasNext && onNavigateNext) {
      setTimeout(() => onNavigateNext(), 250);
    }
  };

  // Switch to Alternate Candidate
  const handleAdoptCandidate = (candValue: string) => {
    setEngineInput(candValue);
    const updated: ArchivedInvoice = {
      ...record,
      engineNumber: candValue,
      candidate2: '',
      candidate3: '',
      isConfirmed: true,
      notes: `${record.notes || ''} (تم اعتماد البديل ${candValue})`,
    };
    onUpdateRecord(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveGeneral = () => {
    const updated: ArchivedInvoice = {
      ...record,
      engineNumber: engineInput.trim(),
      customerName: customerInput.trim(),
      trafficDepartment: trafficInput.trim(),
      date: dateInput.trim(),
    };
    onUpdateRecord(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Apply parsed voice intent to fields
  const applyVoiceIntent = (parsed: VoiceParsedIntent) => {
    if (parsed.engineNumber) {
      setEngineInput(parsed.engineNumber);
      setVoiceFeedback(`تم تحديث الماتور: ${parsed.engineNumber}`);
    }
    if (parsed.customerName) {
      setCustomerInput(parsed.customerName);
      setVoiceFeedback(`تم تحديث العميل: ${parsed.customerName}`);
    }
    if (parsed.trafficDepartment) {
      setTrafficInput(parsed.trafficDepartment);
      setVoiceFeedback(`تم تحديث المرور: ${parsed.trafficDepartment}`);
    }
    if (parsed.date) {
      setDateInput(parsed.date);
      setVoiceFeedback(`تم تحديث التاريخ: ${parsed.date}`);
    }

    if (parsed.action === 'confirm_and_next') {
      setVoiceFeedback('تم الاعتماد والانتقال للسجل التالي!');
      handleConfirmAndClearAlternates(true);
    } else if (parsed.action === 'next' && hasNext && onNavigateNext) {
      setVoiceFeedback('الانتقال للسجل التالي');
      onNavigateNext();
    } else if (parsed.action === 'prev' && hasPrev && onNavigatePrev) {
      setVoiceFeedback('العودة للسجل السابق');
      onNavigatePrev();
    } else if (parsed.action === 'clear_alternates') {
      handleConfirmAndClearAlternates(false);
    }
  };

  // Robust Local MediaRecorder audio pipeline
  const stopMediaRecorderAndTranscribe = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  };

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        setIsProcessingVoice(true);
        setVoiceFeedback('جارٍ المعالجة والتفريغ بالذكاء الاصطناعي...');

        try {
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: audioBlob,
          });

          if (!res.ok) {
            throw new Error(`خطأ في الخادم (${res.status})`);
          }

          const data = await res.json();
          if (data.success && data.text) {
            setVoiceTranscript(data.text);
            const parsed = parseVoiceInput(data.text);
            applyVoiceIntent(parsed);
          } else if (data.success && !data.text) {
            setVoiceFeedback('لم يتم التقاط أي صوت واضح، جرب التحدث مجدداً');
          } else {
            setVoiceFeedback(data.error || 'فشل التفريغ الصوتي');
          }
        } catch (err: any) {
          console.error('Local transcription error:', err);
          setVoiceFeedback('تعذر الاتصال بخادم الصوت المحلي');
        } finally {
          setIsProcessingVoice(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setVoiceFeedback('🔴 جارٍ الاستماع عبر المايك... تكلم الآن ثم اضغط إيقاف');

      // Also try WebSpeechRecognition for instant live words in browsers that support it
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'ar-EG';
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              interim += event.results[i][0].transcript;
            }
            if (interim) setVoiceTranscript(interim);
          };
          recognition.onerror = () => {
            // Silently ignore Google network error in Electron; MediaRecorder handles it!
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch {}
      }
    } catch (e: any) {
      console.error('Microphone access denied:', e);
      setVoiceFeedback('يرجى السماح بصلاحية المايكروفون في المتصفح/الجهاز');
      setIsListening(false);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopMediaRecorderAndTranscribe();
    } else {
      startMediaRecorder();
    }
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

      if (e.key === 'Escape') {
        if (recognitionRef.current) recognitionRef.current.stop();
        onClose();
      } else if (!isInput && e.key === 'ArrowLeft' && hasNext && onNavigateNext) {
        onNavigateNext();
      } else if (!isInput && e.key === 'ArrowRight' && hasPrev && onNavigatePrev) {
        onNavigatePrev();
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleConfirmAndClearAlternates(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [onClose, onNavigateNext, onNavigatePrev, hasNext, hasPrev, engineInput, customerInput, trafficInput, dateInput]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 dark:bg-zinc-800 text-white rounded-lg">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  معاينة وتدقيق السجل الأصلي
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {record.sourceDocumentName}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  صفحة {record.pageNumber} • {record.rowOrPosition}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                طابق الخط اليدوي بالصورة واعتمد بالكيبورد (Ctrl+Enter) أو بالتفريغ الصوتي الذكي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next buttons */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                title="السجل السابق (سهم يمين)"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="text-[10px]">السابق</span>
              </button>
              <button
                type="button"
                onClick={onNavigateNext}
                disabled={!hasNext}
                title="السجل التالي (سهم يسار)"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <span className="text-[10px]">التالي</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          {/* Visual Crop Viewer Card */}
          <div className="bg-zinc-100 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                  {record.cropUrl}
                </span>
                {record.isConfirmed && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> معتمد ومؤكد
                  </span>
                )}
              </div>

              {/* Zoom Toolbar */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
                  title="تصغير"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 min-w-10 text-center font-bold">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
                  title="تكبير"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors border-r border-zinc-200 dark:border-zinc-800 pr-1.5 mr-0.5"
                  title="إعادة ضبط الحجم"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* High-Resolution Strip Canvas Container */}
            <div className="overflow-auto max-h-[340px] min-h-[160px] rounded-lg bg-zinc-200/60 dark:bg-black flex items-center justify-center p-3 border border-zinc-300 dark:border-zinc-800">
              <img
                src={record.cropUrl}
                alt={`قصاصة السطر ${record.id}`}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.12s ease-out',
                }}
                className="max-w-full object-contain rounded shadow-md border border-zinc-300 dark:border-zinc-800"
              />
            </div>
          </div>

          {/* Voice Dictation Bar */}
          <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                disabled={isProcessingVoice}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : isProcessingVoice
                    ? 'bg-amber-600 text-white opacity-80 cursor-wait'
                    : 'bg-zinc-900 dark:bg-amber-500 hover:bg-zinc-800 dark:hover:bg-amber-600 text-white dark:text-black'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>إنهاء والتفريغ الفوري</span>
                  </>
                ) : isProcessingVoice ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ التفريغ...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>تفريغ صوتي ذكي (تكلم)</span>
                  </>
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {voiceFeedback || 'اضغط على الزر، انطق بيانات الفاتورة (ماتور/عميل/مرور) ثم اضغط إنهاء'}
                  </span>
                </div>
                {voiceTranscript && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    المنطوق: &ldquo;{voiceTranscript}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0 hidden md:block">
              اختصار: <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono">Ctrl+Enter</kbd> للاعتماد والتالي
            </div>
          </div>

          {/* Form & Candidate Comparison Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Primary Engine & Alternates (DNA Candidates) */}
            <div className="md:col-span-1 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  رقم المحرك الأساسي
                </label>
                <span className="font-mono text-xs text-zinc-400">
                  {record.indicNumber || ''}
                </span>
              </div>

              <div>
                <input
                  type="text"
                  dir="ltr"
                  value={engineInput}
                  onChange={(e) => setEngineInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-mono font-bold text-zinc-900 dark:text-white tracking-widest text-center focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Candidates 2 and 3 if available */}
              {(record.candidate2 || record.candidate3) && (
                <div className="space-y-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    الاحتمالات المرجعية (بدائل 2/3 أو 5/0):
                  </p>
                  {record.candidate2 && (
                    <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                      <span className="text-[11px] text-zinc-500">بديل 2:</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200" dir="ltr">
                        {record.candidate2}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdoptCandidate(record.candidate2!)}
                        className="text-[10px] px-2 py-0.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded font-bold transition-colors cursor-pointer"
                      >
                        اعتماده
                      </button>
                    </div>
                  )}
                  {record.candidate3 && (
                    <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                      <span className="text-[11px] text-zinc-500">بديل 3:</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200" dir="ltr">
                        {record.candidate3}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAdoptCandidate(record.candidate3!)}
                        className="text-[10px] px-2 py-0.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded font-bold transition-colors cursor-pointer"
                      >
                        اعتماده
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button: Confirm, Clear Alternates, and Advance */}
              <button
                type="button"
                onClick={() => handleConfirmAndClearAlternates(true)}
                className="mt-auto w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد الرقم ومسح البدائل (والتالي)</span>
              </button>
            </div>

            {/* Customer, Traffic & General Details */}
            <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer Name */}
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    اسم العميل / المشتري (الأولوية الأولى)
                  </label>
                  <input
                    type="text"
                    value={customerInput}
                    onChange={(e) => setCustomerInput(e.target.value)}
                    placeholder="اسم العميل المشتري..."
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-800 dark:focus:border-zinc-500"
                  />
                </div>

                {/* Traffic Department */}
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    جهة المرور / الترخيص
                  </label>
                  <input
                    type="text"
                    value={trafficInput}
                    onChange={(e) => setTrafficInput(e.target.value)}
                    placeholder="مرور البرج، دمنهور، طنطا..."
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-800 dark:focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Supplementary Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-[11px] text-zinc-400 block">التاجر (إن وجد)</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {record.merchantName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block">التاريخ</span>
                  <input
                    type="text"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    placeholder="التاريخ..."
                    className="w-full px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs text-zinc-800 dark:text-zinc-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block">الهاتف</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {record.phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block">حالة التطابق</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {record.matchType || (record.isMatchedWithDoc1 ? 'متطابق' : 'مستقل')}
                  </span>
                </div>
              </div>

              {/* Doc 1 Cross-link (if Doc 2 matched record) */}
              {record.matchedDoc1Page && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>مرتبط بسجل في الدفتر الأول:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <span>صفحة: <strong>{record.matchedDoc1Page}</strong></span>
                    <span>سطر: <strong>{record.matchedDoc1Row}</strong></span>
                    <span>ماتور: <strong dir="ltr">{record.matchedDoc1Engine}</strong></span>
                    <span>عميل: <strong>{record.matchedDoc1Customer}</strong></span>
                  </div>
                </div>
              )}

              {/* Save changes footer */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> تم الحفظ والاعتماد بنجاح!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGeneral}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
