import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Sliders,
  Maximize2,
} from 'lucide-react';

export interface LedgerRow {
  rowNumber: number;
  engineNumber: string;
  engineCategory: string;
  merchantName: string;
  customerName: string;
  trafficDepartment: string;
  exportNumber: string;
  exportDate: string;
  notes: string;
  pageNumber: number;
  confidence?: 'high' | 'low';
  auditReason?: string;
  isHumanVerified?: boolean;
}

const COMMON_BRANDS = ['تويوتا', 'شيفروليه أوبترا', 'لانوس', 'فيرنا', 'إلنترا', 'سكودا', 'نيسان', 'ميتسوبيشي لانسر'];
const COMMON_MERCHANTS = ['السمبو', 'شريف راشد', 'سوسو', 'مراد الصعيدي', 'مصطفى دخيل', 'أبو عمر', 'السيد شريف'];
const COMMON_TRAFFIC = ['البرج', 'الغربية', 'مطروح', 'أبيس', 'المنتزه', 'العجمي', 'المحلة', 'الحمام', 'الجيزة'];

export const LedgerAuditStudio: React.FC = () => {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentRowIndexOnPage, setCurrentRowIndexOnPage] = useState<number>(0);
  const [totalPages] = useState<number>(68);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Image viewer state (free pan & zoom)
  const [zoomLevel, setZoomLevel] = useState<number>(1.1);
  const [rotation, setRotation] = useState<number>(0);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [panPos, setPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    // Load from local storage or master JSON
    const saved = localStorage.getItem('el_wikalla_doc1_audit_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRows(parsed);
        setIsLoading(false);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    fetch('/doc1_extracted_master.json')
      .then((res) => res.json())
      .then((data: LedgerRow[]) => {
        setRows(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load doc1 data', err);
        setIsLoading(false);
      });
  }, []);

  const saveToStorage = (updated: LedgerRow[]) => {
    setRows(updated);
    localStorage.setItem('el_wikalla_doc1_audit_data', JSON.stringify(updated));
  };

  // Get current page rows
  const pageRows = rows.filter((r) => r.pageNumber === currentPage);
  const currentRow: LedgerRow | undefined = pageRows[currentRowIndexOnPage];

  // Global index of current row
  const globalRowIndex = rows.findIndex(
    (r) => r.pageNumber === currentPage && r.rowNumber === currentRow?.rowNumber
  );

  // Field change handler
  const handleFieldChange = (field: keyof LedgerRow, val: any) => {
    if (globalRowIndex === -1) return;
    const updated = [...rows];
    updated[globalRowIndex] = {
      ...updated[globalRowIndex],
      [field]: val,
    };
    saveToStorage(updated);
  };

  // Actions
  const handleConfirmAndNext = () => {
    if (globalRowIndex !== -1) {
      const updated = [...rows];
      updated[globalRowIndex] = {
        ...updated[globalRowIndex],
        isHumanVerified: true,
        confidence: 'high',
      };
      saveToStorage(updated);
    }

    // Move to next row or next page
    if (currentRowIndexOnPage < pageRows.length - 1) {
      setCurrentRowIndexOnPage((prev) => prev + 1);
    } else if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      setCurrentRowIndexOnPage(0);
      setPanPos({ x: 0, y: 0 });
    }
  };

  const handleNextOnly = () => {
    if (currentRowIndexOnPage < pageRows.length - 1) {
      setCurrentRowIndexOnPage((prev) => prev + 1);
    } else if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      setCurrentRowIndexOnPage(0);
      setPanPos({ x: 0, y: 0 });
    }
  };

  const handlePrevOnly = () => {
    if (currentRowIndexOnPage > 0) {
      setCurrentRowIndexOnPage((prev) => prev - 1);
    } else if (currentPage > 1) {
      const prevPageRows = rows.filter((r) => r.pageNumber === currentPage - 1);
      setCurrentPage((prev) => prev - 1);
      setCurrentRowIndexOnPage(Math.max(0, prevPageRows.length - 1));
      setPanPos({ x: 0, y: 0 });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmAndNext();
        }
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleConfirmAndNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNextOnly();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePrevOnly();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRowIndexOnPage, currentPage, rows, pageRows]);

  // Touch / Mouse Pan Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - panPos.x, y: e.clientY - panPos.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPanPos({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Image source
  const currentImgSrc = `/ledger_images/doc1/page_${String(currentPage - 1).padStart(4, '0')}.png`;

  // Export
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rows, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'doc1_verified_master.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] text-zinc-400">
        <Sparkles className="w-6 h-6 animate-spin text-amber-500 mr-2" />
        <span>جارٍ تجهيز شاشة المراجعة السريعة...</span>
      </div>
    );
  }

  const verifiedCount = rows.filter((r) => r.isHumanVerified).length;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] w-full overflow-hidden bg-black text-white select-none">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP 40%: OPEN INTERACTIVE IMAGE (PINCH, ZOOM, PAN FREELY)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className="h-[40vh] w-full bg-zinc-950 relative overflow-hidden border-b border-zinc-800 cursor-grab active:cursor-grabbing flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Floating Quick Controls on Top of Image */}
        <div className="absolute top-2 inset-x-2 z-20 flex items-center justify-between pointer-events-none">
          {/* Page Badge & Navigation */}
          <div className="bg-black/85 backdrop-blur-md border border-zinc-750 px-3 py-1.5 rounded-xl flex items-center gap-2 pointer-events-auto shadow-lg text-xs">
            <span className="text-zinc-400">صفحة:</span>
            <select
              value={currentPage}
              onChange={(e) => {
                setCurrentPage(Number(e.target.value));
                setCurrentRowIndexOnPage(0);
                setPanPos({ x: 0, y: 0 });
              }}
              className="bg-zinc-900 text-amber-400 font-bold font-mono rounded px-1.5 py-0.5 text-xs border border-zinc-700"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>
                  {p} من {totalPages}
                </option>
              ))}
            </select>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400 font-mono text-[11px] font-bold">
              {verifiedCount} معتمد
            </span>
          </div>

          {/* Zoom / Contrast Buttons */}
          <div className="bg-black/85 backdrop-blur-md border border-zinc-750 p-1 rounded-xl flex items-center gap-1 pointer-events-auto shadow-lg">
            <button
              onClick={() => setZoomLevel((z) => Math.min(3.5, z + 0.3))}
              className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-700 text-zinc-200"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.3))}
              className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-700 text-zinc-200"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-700 text-zinc-200"
              title="تدوير"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setHighContrast((c) => !c)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                highContrast ? 'bg-amber-500 text-black' : 'bg-zinc-850 text-zinc-300'
              }`}
              title="توضيح الحبر"
            >
              تباين
            </button>
            <button
              onClick={() => {
                setZoomLevel(1.1);
                setPanPos({ x: 0, y: 0 });
                setRotation(0);
              }}
              className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-700 text-zinc-300"
              title="إعادة ضبط"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The Open Page Image */}
        <img
          src={currentImgSrc}
          alt={`Page ${currentPage}`}
          draggable={false}
          style={{
            transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
            filter: highContrast ? 'contrast(200%) brightness(85%) grayscale(100%)' : 'none',
            transition: isDragging.current ? 'none' : 'transform 0.15s ease-out, filter 0.2s ease',
          }}
          className="max-h-full max-w-none object-contain pointer-events-none select-none drop-shadow-2xl"
        />

        {/* Subtle helper hint */}
        <span className="absolute bottom-1 right-2 text-[9px] text-zinc-500 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
          اسحب بالماوس للتحريك في أي اتجاه
        </span>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BOTTOM 60%: FOCUSED SINGLE RECORD CARD & QUICK BUTTONS      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-zinc-950 flex flex-col justify-between p-3 overflow-hidden">
        {/* Row Header & Step Indicator */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-black font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg">
              مكنة {currentRowIndexOnPage + 1} من {pageRows.length}
            </span>
            <span className="text-[11px] text-zinc-400">
              (صفحة {currentPage})
            </span>
            {currentRow?.isHumanVerified && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3 h-3" />
                معتمد
              </span>
            )}
          </div>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-2.5 py-1 rounded-lg text-[11px]"
          >
            <Download className="w-3 h-3" />
            <span>تصدير JSON</span>
          </button>
        </div>

        {/* PRIMARY HIGHLIGHT: ENGINE NUMBER (BIG & BOLD) */}
        <div className="my-1.5">
          <label className="text-[10px] text-zinc-400 font-bold block mb-1 text-center">
            رقم الماتور (اضغط لتعديل الرقم مباشرة):
          </label>
          <input
            type="text"
            value={currentRow?.engineNumber || ''}
            onChange={(e) => handleFieldChange('engineNumber', e.target.value)}
            className="w-full bg-black border-2 border-amber-500/70 focus:border-amber-400 rounded-xl py-2 px-4 text-center font-mono font-bold text-2xl tracking-widest text-amber-400 shadow-inner focus:outline-hidden"
            placeholder="رقم الماتور..."
          />
        </div>

        {/* COMPACT FIELDS GRID (ALL EDITABLE IN PLACE) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* 1. Category */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 space-y-1">
            <label className="text-[10px] text-zinc-400 block font-medium">نوع الماتور / الفئة</label>
            <input
              type="text"
              value={currentRow?.engineCategory || ''}
              onChange={(e) => handleFieldChange('engineCategory', e.target.value)}
              className="w-full bg-black border border-zinc-750 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:border-amber-500 focus:outline-hidden font-medium"
            />
            {/* Quick Pills */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pt-0.5">
              {COMMON_BRANDS.slice(0, 4).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleFieldChange('engineCategory', b)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded text-[9px] shrink-0"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Merchant */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 space-y-1">
            <label className="text-[10px] text-zinc-400 block font-medium">اسم التاجر</label>
            <input
              type="text"
              value={currentRow?.merchantName || ''}
              onChange={(e) => handleFieldChange('merchantName', e.target.value)}
              className="w-full bg-black border border-zinc-750 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:border-amber-500 focus:outline-hidden font-medium"
            />
            {/* Quick Pills */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pt-0.5">
              {COMMON_MERCHANTS.slice(0, 4).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleFieldChange('merchantName', m)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded text-[9px] shrink-0"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Customer Name */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 space-y-1">
            <label className="text-[10px] text-zinc-400 block font-medium">اسم المشتري</label>
            <input
              type="text"
              value={currentRow?.customerName || ''}
              onChange={(e) => handleFieldChange('customerName', e.target.value)}
              className="w-full bg-black border border-zinc-750 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:border-amber-500 focus:outline-hidden font-bold"
            />
          </div>

          {/* 4. Traffic Department */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 space-y-1">
            <label className="text-[10px] text-zinc-400 block font-medium">المرور المصدر إليه</label>
            <input
              type="text"
              value={currentRow?.trafficDepartment || ''}
              onChange={(e) => handleFieldChange('trafficDepartment', e.target.value)}
              className="w-full bg-black border border-zinc-750 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:border-amber-500 focus:outline-hidden font-medium"
            />
            {/* Quick Pills */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pt-0.5">
              {COMMON_TRAFFIC.slice(0, 4).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleFieldChange('trafficDepartment', t)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded text-[9px] shrink-0"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Export No & Date & Notes (Inline Single Line) */}
        <div className="grid grid-cols-3 gap-2 text-xs pt-1">
          <div>
            <label className="text-[9px] text-zinc-500 block">رقم الصادر</label>
            <input
              type="text"
              value={currentRow?.exportNumber || ''}
              onChange={(e) => handleFieldChange('exportNumber', e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-2 py-0.5 font-mono text-[11px] text-zinc-200"
              placeholder="-"
            />
          </div>
          <div>
            <label className="text-[9px] text-zinc-500 block">تاريخ الصادر</label>
            <input
              type="text"
              value={currentRow?.exportDate || ''}
              onChange={(e) => handleFieldChange('exportDate', e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-2 py-0.5 font-mono text-[11px] text-zinc-200"
              placeholder="-"
            />
          </div>
          <div>
            <label className="text-[9px] text-zinc-500 block">ملاحظات</label>
            <input
              type="text"
              value={currentRow?.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-2 py-0.5 text-[11px] text-zinc-400"
              placeholder="-"
            />
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* BOTTOM FIXED ACTION BUTTONS (HUGE, THUMB-FRIENDLY)          */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-850">
          {/* Previous Button */}
          <button
            onClick={handlePrevOnly}
            className="flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold px-3 py-3 rounded-xl text-xs border border-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">السابق</span>
          </button>

          {/* BIG GREEN CONFIRM & SAVE BUTTON */}
          <button
            onClick={handleConfirmAndNext}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-xl transition-transform active:scale-98 cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>اعتماد وحفظ (Enter)</span>
          </button>

          {/* Next Button */}
          <button
            onClick={handleNextOnly}
            className="flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold px-4 py-3 rounded-xl text-xs border border-zinc-700 transition-colors cursor-pointer shrink-0"
          >
            <span>التالي</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
