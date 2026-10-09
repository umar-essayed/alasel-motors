import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Cpu,
  Brain,
  Sparkles,
  Edit3,
  Save,
  Check,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Eye
} from 'lucide-react';

interface Candidate {
  number: string;
  confidence: number;
  confidence_pct: string;
}

interface Doc2Receipt {
  id: string;
  pageNumber: number;
  receiptType: string;
  imageUrl: string;
  patchUrl: string;
  top3Candidates: Candidate[];
  verifiedEngineNumber: string;
  customerName: string;
  engineCategory: string;
  saleDate: string;
  status: 'pending' | 'verified';
}

export const Doc2ActiveLearningStudio: React.FC = () => {
  const [receipts, setReceipts] = useState<Doc2Receipt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [showPatchZoom, setShowPatchZoom] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [exemplarsCount, setExemplarsCount] = useState(0);
  const [learnedNotice, setLearnedNotice] = useState<string | null>(null);

  // Load master receipts data
  useEffect(() => {
    fetch('/doc2_receipts_master.json')
      .then((res) => res.json())
      .then((data: Doc2Receipt[]) => {
        setReceipts(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load doc2 receipts:', err);
        setIsLoading(false);
      });
  }, []);

  const currentReceipt = receipts[currentIndex];

  useEffect(() => {
    if (currentReceipt) {
      setManualNumber(currentReceipt.verifiedEngineNumber || (currentReceipt.top3Candidates?.[0]?.number || ''));
      setIsManualEditing(false);
    }
  }, [currentIndex, currentReceipt]);

  // Keyboard navigation & quick shortcuts (1, 2, 3, E, Enter, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in an input field, allow normal typing
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Enter') {
          handleSaveManual();
        }
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        handleSelectCandidate(0);
      } else if (e.key === '2') {
        e.preventDefault();
        handleSelectCandidate(1);
      } else if (e.key === '3') {
        e.preventDefault();
        handleSelectCandidate(2);
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'ت') {
        e.preventDefault();
        setIsManualEditing(true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, receipts, currentReceipt, isManualEditing, manualNumber]);

  const handleSelectCandidate = (candIdx: number) => {
    if (!currentReceipt || !currentReceipt.top3Candidates[candIdx]) return;
    const selectedNum = currentReceipt.top3Candidates[candIdx].number;

    const updated = [...receipts];
    updated[currentIndex] = {
      ...currentReceipt,
      verifiedEngineNumber: selectedNum,
      status: 'verified',
    };
    setReceipts(updated);

    // Try posting to local python active learning server if running
    fetch('http://127.0.0.1:8088/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiptId: currentReceipt.id,
        engineNumber: selectedNum,
        candidateIndex: candIdx,
        wasManualEdit: false,
      }),
    }).catch(() => {});

    // Step to next immediately
    handleNext();
  };

  const handleSaveManual = () => {
    if (!currentReceipt || !manualNumber.trim()) return;
    const original = currentReceipt.top3Candidates?.[0]?.number || '';
    const corrected = manualNumber.trim();

    const updated = [...receipts];
    updated[currentIndex] = {
      ...currentReceipt,
      verifiedEngineNumber: corrected,
      status: 'verified',
    };
    setReceipts(updated);
    setIsManualEditing(false);

    // Notify adaptive learning
    setExemplarsCount((prev) => prev + 1);
    setLearnedNotice(`تم تسجيل التعديل من ${original} إلى ${corrected} في الذاكرة البصرية التكيفية بدون تعميم أعمى.`);
    setTimeout(() => setLearnedNotice(null), 4000);

    // Call local server
    fetch('http://127.0.0.1:8088/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiptId: currentReceipt.id,
        engineNumber: corrected,
        wasManualEdit: true,
        originalPred: original,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.exemplarsLearned) setExemplarsCount(res.exemplarsLearned);
      })
      .catch(() => {});

    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < receipts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setZoomLevel(1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setZoomLevel(1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-400">
        <Cpu className="w-10 h-10 animate-spin text-amber-500 mb-3" />
        <p className="text-sm">جاري تحميل فواتير الدفتر الكبير ونموذج الأرقام الذكي...</p>
      </div>
    );
  }

  if (!currentReceipt) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p>لا توجد فواتير مقصوصة متاحة حالياً.</p>
      </div>
    );
  }

  const verifiedTotal = receipts.filter((r) => r.status === 'verified').length;
  const progressPercent = Math.round((verifiedTotal / receipts.length) * 100);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-7xl mx-auto overflow-hidden text-zinc-100 select-none pb-1">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
            الدفتر الكبير (373 صفحة)
          </span>
          <span className="text-zinc-400">
            فاتورة <strong className="text-white">{currentIndex + 1}</strong> من{' '}
            <strong className="text-white">{receipts.length}</strong>
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-emerald-400 font-medium">{currentReceipt.receiptType}</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400">صفحة {currentReceipt.pageNumber}</span>
        </div>

        {/* Progress & Adaptive Memory Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px] text-zinc-300">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>الذاكرة البصرية:</span>
            <span className="font-bold text-purple-300 font-mono">{exemplarsCount} أنماط</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-zinc-850 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono text-zinc-400">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Adaptive Learning Toast Notification */}
      {learnedNotice && (
        <div className="bg-purple-950/80 border-b border-purple-600/40 text-purple-200 text-xs px-3 py-1.5 flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>{learnedNotice}</span>
        </div>
      )}

      {/* UPPER 40% VIEWPORT: Sliced Receipt Image & Zoomed Engine Patch */}
      <div className="h-[42%] relative bg-zinc-950 flex border-b border-zinc-800 overflow-hidden">
        {/* Main Cropped Receipt Image */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group">
          <img
            src={currentReceipt.imageUrl}
            alt="صورة الفاتورة المقصوصة"
            className="max-h-full max-w-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            }}
          />

          {/* Quick Floating Controls */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-lg border border-zinc-700/60 z-10">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-300"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-300"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-300"
              title="تدوير 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowPatchZoom((p) => !p)}
              className={`p-1 rounded text-xs flex items-center gap-1 ${
                showPatchZoom ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
              title="إظهار مكبر رقم المكنة"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[10px]">المكبر</span>
            </button>
          </div>
        </div>

        {/* Side High-Def Zoom Patch (Focused specifically on handwritten digits) */}
        {showPatchZoom && (
          <div className="w-[38%] border-r border-zinc-800 bg-zinc-900/90 flex flex-col items-center justify-center p-2 relative">
            <div className="text-[10px] text-amber-400/90 mb-1 flex items-center gap-1 font-bold">
              <span>🔍 مكبر رقم المكنة بالقلم اليدوي:</span>
            </div>
            <div className="w-full flex-1 flex items-center justify-center bg-black/60 rounded border border-zinc-700/60 overflow-hidden p-1">
              <img
                src={currentReceipt.patchUrl}
                alt="قصاصة رقم المكنة"
                className="max-h-full max-w-full object-contain filter contrast-125 brightness-105"
              />
            </div>
          </div>
        )}
      </div>

      {/* LOWER 58% VIEWPORT: 3 Candidates + Active Verification Controls */}
      <div className="flex-1 bg-zinc-950 p-3 flex flex-col justify-between overflow-y-auto">
        {/* TOP 3 CANDIDATES SECTION */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-zinc-200">
                أقوى 3 احتمالات لرقم الماتور (انقر أو اضغط 1, 2, 3 بالكيبورد للاعتماد الفوري):
              </h2>
            </div>
            <span className="text-[10px] text-zinc-400">
              الحالي:{' '}
              <strong className="text-amber-300 font-mono text-xs">
                {currentReceipt.verifiedEngineNumber || currentReceipt.top3Candidates?.[0]?.number}
              </strong>
            </span>
          </div>

          {/* 3 Large Candidate Action Buttons */}
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {currentReceipt.top3Candidates.map((cand, idx) => {
              const isSelected = currentReceipt.verifiedEngineNumber === cand.number;
              const hotkeyNum = idx + 1;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectCandidate(idx)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                      : 'bg-zinc-900/90 hover:bg-zinc-850 border-zinc-750 hover:border-zinc-600 text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 text-[11px] font-bold flex items-center justify-center border border-zinc-700">
                      {hotkeyNum}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        idx === 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : idx === 1
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {cand.confidence_pct}
                    </span>
                  </div>

                  <span className="text-xl md:text-2xl font-black font-mono tracking-wider text-white">
                    {cand.number}
                  </span>

                  <span className="text-[10px] text-zinc-400 mt-1">
                    {isSelected ? '✓ معتمد حالياً' : 'اعتماد فوري'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Manual Edit or "All are wrong" button */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 mb-2.5 flex items-center justify-between">
            {!isManualEditing ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300">هل الأرقام الثلاثة بها خطأ؟</span>
                </div>
                <button
                  onClick={() => setIsManualEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل يدوي (مفتاح E)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full animate-fadeIn">
                <input
                  type="text"
                  autoFocus
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                  placeholder="اكتب رقم الماتور الصحيح هنا..."
                  className="flex-1 bg-black border border-amber-500 rounded-lg px-3 py-1.5 text-base font-mono font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={handleSaveManual}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-450 text-black font-bold text-xs transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ وتعلم (Enter)</span>
                </button>
                <button
                  onClick={() => setIsManualEditing(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>

          {/* Quick Invoice Details Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-zinc-900/50 border border-zinc-850 p-2 rounded-lg">
              <span className="text-[10px] text-zinc-400 block mb-0.5">نوع الماتور:</span>
              <input
                type="text"
                value={currentReceipt.engineCategory}
                onChange={(e) => {
                  const updated = [...receipts];
                  updated[currentIndex].engineCategory = e.target.value;
                  setReceipts(updated);
                }}
                className="w-full bg-transparent font-medium text-zinc-200 focus:outline-none focus:text-white"
              />
            </div>

            <div className="bg-zinc-900/50 border border-zinc-850 p-2 rounded-lg">
              <span className="text-[10px] text-zinc-400 block mb-0.5">اسم المشتري:</span>
              <input
                type="text"
                value={currentReceipt.customerName}
                placeholder="غير محدد / بيع مباشر"
                onChange={(e) => {
                  const updated = [...receipts];
                  updated[currentIndex].customerName = e.target.value;
                  setReceipts(updated);
                }}
                className="w-full bg-transparent font-medium text-zinc-200 focus:outline-none focus:text-white"
              />
            </div>

            <div className="bg-zinc-900/50 border border-zinc-850 p-2 rounded-lg">
              <span className="text-[10px] text-zinc-400 block mb-0.5">التاريخ:</span>
              <input
                type="text"
                value={currentReceipt.saleDate}
                onChange={(e) => {
                  const updated = [...receipts];
                  updated[currentIndex].saleDate = e.target.value;
                  setReceipts(updated);
                }}
                className="w-full bg-transparent font-medium text-zinc-200 focus:outline-none focus:text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM STEPPER & FOOTER CONTROLS */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-850 mt-1">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 disabled:opacity-40 border border-zinc-800 text-zinc-300 text-xs transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق (→)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectCandidate(0)}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد الاحتمال الأول والتالي (1)</span>
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === receipts.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 disabled:opacity-40 border border-zinc-800 text-zinc-300 text-xs transition-all cursor-pointer"
          >
            <span>التالي (←)</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
