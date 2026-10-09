import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { ArchivedInvoice } from '../../types';
import {
  createSearchIndex,
  fastMatchIndexedRecord,
  buildFuzzyDigitPattern,
  normalizeArabic,
  toLatinDigits,
  IndexedArchivedInvoice,
} from '../../utils/archiveSearchUtils';
import { exportToCsv } from '../../utils/exportUtils';
import { VisualCropModal } from './VisualCropModal';
import {
  Archive,
  Search,
  CheckCircle2,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  Link2,
  Check,
  ChevronLeft,
  ChevronRight,
  Mic,
  AlertCircle,
  X,
} from 'lucide-react';

const LOCAL_STORAGE_OVERRIDES_KEY = 'alasel_archived_invoices_overrides_v1';

export const PastInvoicesArchiveView: React.FC = () => {
  const [rawRecords, setRawRecords] = useState<ArchivedInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter State
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [, startTransition] = useTransition();

  const [fuzzyDigitsEnabled, setFuzzyDigitsEnabled] = useState(true);
  const [selectedDocSource, setSelectedDocSource] = useState<
    'all' | 'unconfirmed' | 'doc1_ledger' | 'doc2_receipts' | 'matched' | 'confirmed'
  >('all');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [selectedTraffic, setSelectedTraffic] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Modal State
  const [activeModalRecordId, setActiveModalRecordId] = useState<string | null>(null);

  // 1. Load database and merge local overrides once
  useEffect(() => {
    const fetchDatabase = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/archived_invoices_database.json');
        if (!res.ok) {
          throw new Error(`تعذر تحميل قاعدة البيانات (${res.status})`);
        }
        const data: ArchivedInvoice[] = await res.json();

        // Load overrides from localStorage
        let localOverrides: Record<string, Partial<ArchivedInvoice>> = {};
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_OVERRIDES_KEY);
          if (stored) {
            localOverrides = JSON.parse(stored);
          }
        } catch {}

        const merged = data.map((rec) => {
          if (localOverrides[rec.id]) {
            return { ...rec, ...localOverrides[rec.id] };
          }
          return rec;
        });

        setRawRecords(merged);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to load archived invoices:', err);
        setLoadError(err.message || 'حدث خطأ أثناء تحميل قاعدة البيانات');
        setIsLoading(false);
      }
    };

    fetchDatabase();
  }, []);

  // 2. High-performance Search Index (computed only when records change)
  const indexedRecords = useMemo<IndexedArchivedInvoice[]>(() => {
    return createSearchIndex(rawRecords);
  }, [rawRecords]);

  // 3. Instant Debounced Search Handler (zero keystroke lag)
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(inputValue.trim());
      });
    }, 75); // Super snappy 75ms debounce

    return () => clearTimeout(handler);
  }, [inputValue]);

  // 4. Save record updates with local persistence
  const handleUpdateRecord = (updated: ArchivedInvoice) => {
    setRawRecords((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_OVERRIDES_KEY);
      const overrides: Record<string, Partial<ArchivedInvoice>> = stored ? JSON.parse(stored) : {};
      overrides[updated.id] = {
        engineNumber: updated.engineNumber,
        customerName: updated.customerName,
        trafficDepartment: updated.trafficDepartment,
        date: updated.date,
        candidate2: updated.candidate2,
        candidate3: updated.candidate3,
        isConfirmed: updated.isConfirmed,
        notes: updated.notes,
      };
      localStorage.setItem(LOCAL_STORAGE_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.error('Failed to persist override:', e);
    }
  };

  // Quick 1-click confirmation from table row
  const handleQuickConfirm = (record: ArchivedInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: ArchivedInvoice = {
      ...record,
      candidate2: '',
      candidate3: '',
      isConfirmed: true,
      notes: record.notes ? `${record.notes} (معتمد)` : 'معتمد',
    };
    handleUpdateRecord(updated);
  };

  // Unique traffic departments
  const trafficDepartments = useMemo(() => {
    const set = new Set<string>();
    rawRecords.forEach((r) => {
      if (r.trafficDepartment && r.trafficDepartment.trim()) {
        set.add(r.trafficDepartment.trim());
      }
    });
    return Array.from(set).sort();
  }, [rawRecords]);

  // Unique page numbers
  const pageNumbers = useMemo(() => {
    const set = new Set<number>();
    rawRecords.forEach((r) => {
      if (r.pageNumber) set.add(r.pageNumber);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [rawRecords]);

  // Counts for pills
  const totalCount = rawRecords.length;
  const unconfirmedCount = useMemo(() => rawRecords.filter((r) => !r.isConfirmed).length, [rawRecords]);
  const doc1Count = useMemo(() => rawRecords.filter((r) => r.sourceDocument === 'doc1_ledger').length, [rawRecords]);
  const doc2Count = useMemo(() => rawRecords.filter((r) => r.sourceDocument === 'doc2_receipts').length, [rawRecords]);
  const matchedCount = useMemo(() => rawRecords.filter((r) => r.isMatchedWithDoc1).length, [rawRecords]);
  const confirmedCount = useMemo(() => rawRecords.filter((r) => r.isConfirmed).length, [rawRecords]);

  // 5. Optimized Filtering Logic
  const filteredRecords = useMemo(() => {
    const queryNorm = normalizeArabic(debouncedQuery);
    const latinDigits = toLatinDigits(debouncedQuery).replace(/\D/g, '');
    const fuzzyPattern =
      fuzzyDigitsEnabled && latinDigits.length >= 2
        ? buildFuzzyDigitPattern(latinDigits)
        : null;

    return indexedRecords.filter((rec) => {
      // 1. Source filter
      if (selectedDocSource === 'unconfirmed' && rec.isConfirmed) return false;
      if (selectedDocSource === 'confirmed' && !rec.isConfirmed) return false;
      if (selectedDocSource === 'doc1_ledger' && rec.sourceDocument !== 'doc1_ledger') return false;
      if (selectedDocSource === 'doc2_receipts' && rec.sourceDocument !== 'doc2_receipts') return false;
      if (selectedDocSource === 'matched' && !rec.isMatchedWithDoc1) return false;

      // 2. Page filter
      if (selectedPage !== 'all' && String(rec.pageNumber) !== selectedPage) return false;

      // 3. Traffic filter
      if (selectedTraffic !== 'all' && rec.trafficDepartment !== selectedTraffic) return false;

      // 4. Ultra-fast match
      if (queryNorm) {
        return fastMatchIndexedRecord(rec, queryNorm, latinDigits, fuzzyPattern);
      }

      return true;
    });
  }, [indexedRecords, selectedDocSource, selectedPage, selectedTraffic, debouncedQuery, fuzzyDigitsEnabled]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, selectedDocSource, selectedPage, selectedTraffic, fuzzyDigitsEnabled]);

  // Pagination calculation
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredRecords, startIndex, pageSize]);

  // Active modal record lookup
  const activeModalRecord = useMemo(() => {
    if (!activeModalRecordId) return null;
    return rawRecords.find((r) => r.id === activeModalRecordId) || null;
  }, [rawRecords, activeModalRecordId]);

  // Modal navigation
  const activeModalIndex = useMemo(() => {
    if (!activeModalRecordId) return -1;
    return filteredRecords.findIndex((r) => r.id === activeModalRecordId);
  }, [filteredRecords, activeModalRecordId]);

  const handleNavigateModalPrev = () => {
    if (activeModalIndex > 0) {
      setActiveModalRecordId(filteredRecords[activeModalIndex - 1].id);
    }
  };

  const handleNavigateModalNext = () => {
    if (activeModalIndex >= 0 && activeModalIndex < filteredRecords.length - 1) {
      setActiveModalRecordId(filteredRecords[activeModalIndex + 1].id);
    }
  };

  // Start Fast Daily Audit Session
  const handleStartAuditSession = () => {
    setSelectedDocSource('unconfirmed');
    // Find first unconfirmed
    const firstUnconfirmed = rawRecords.find((r) => !r.isConfirmed);
    if (firstUnconfirmed) {
      setActiveModalRecordId(firstUnconfirmed.id);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'المعرف',
      'المصدر',
      'الصفحة',
      'الموضع',
      'رقم المحرك الأساسي',
      'الأرقام الهندية',
      'بديل 2',
      'بديل 3',
      'اسم العميل',
      'التاجر',
      'المرور',
      'التاريخ',
      'الهاتف',
      'حالة التأكيد',
      'الملاحظات',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.sourceDocumentName,
      r.pageNumber,
      r.rowOrPosition,
      r.engineNumber,
      r.indicNumber || '',
      r.candidate2 || '',
      r.candidate3 || '',
      r.customerName || '',
      r.merchantName || '',
      r.trafficDepartment || '',
      r.date || '',
      r.phone || '',
      r.isConfirmed ? 'مؤكد ومعتمد' : 'يحتاج مراجعة',
      r.notes || '',
    ]);

    const filename = `أرشيف_فواتير_الموتوسيكلات_${new Date().toISOString().slice(0, 10)}`;
    exportToCsv(filename, headers, rows);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <RefreshCw className="w-7 h-7 text-zinc-600 dark:text-zinc-400 animate-spin" />
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          جاري تجهيز فهرس الأرشيف للبحث فائق السرعة ({totalCount.toLocaleString('ar-EG')} سجل)...
        </p>
        <span className="text-xs text-zinc-400">تحميل بيانات مبيعات المكن وإيصالات التسليم بالكامل</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-6 text-center text-red-700 dark:text-red-300">
        <p className="font-bold text-sm mb-1">تعذر تحميل بيانات الأرشيف</p>
        <p className="text-xs">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-10 text-zinc-900 dark:text-zinc-100">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center shrink-0">
            <Archive className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                أرشيف الفواتير والدفاتر السابقة
              </h2>
              <span className="text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md font-bold">
                {rawRecords.length.toLocaleString('ar-EG')} سجل
              </span>
              {filteredRecords.length !== rawRecords.length && (
                <span className="text-[11px] bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md font-semibold border border-amber-500/20">
                  {filteredRecords.length.toLocaleString('ar-EG')} نتيجة مطابقة
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              دفتر مبيعات المكن الكامل (1,088) + دفتر إيصالات التسليم (746) مع محرك بحث 0ms وتفريغ صوتي ذكي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Fast Voice Audit Session Button */}
          {unconfirmedCount > 0 && (
            <button
              type="button"
              onClick={handleStartAuditSession}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              title="بدء جلسة يومية لمراجعة وتدقيق السجلات المتبقية صوتياً"
            >
              <Mic className="w-4 h-4 text-black" />
              <span>جلسة تدقيق صوتي ({unconfirmedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير إكسيل ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col gap-3 shadow-xs">
        {/* Row 1: Search input + Error tolerance toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="ابحث فوراً: رقم المحرك، اسم المشتري، جهة المرور، التاجر، رقم الصفحة..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full pl-8 pr-9 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue('')}
                className="absolute left-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs p-0.5 rounded cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Smart Error-Tolerant Toggle */}
          <button
            type="button"
            onClick={() => setFuzzyDigitsEnabled(!fuzzyDigitsEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer shrink-0 ${
              fuzzyDigitsEnabled
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300'
                : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
            title="تعويض الأخطاء البصرية الشائعة في الخط اليدوي مثل الخلط بين 2 و 3، وبين 5 و 0، وبين 7 و 8"
          >
            <Sparkles className={`w-3.5 h-3.5 ${fuzzyDigitsEnabled ? 'text-amber-500' : 'text-zinc-400'}`} />
            <span>البحث المرن للخلط (2↔3 و 0↔5)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                fuzzyDigitsEnabled ? 'bg-amber-500 text-black' : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {fuzzyDigitsEnabled ? 'مفعّل' : 'معطل'}
            </span>
          </button>
        </div>

        {/* Row 2: Source Filter Pills & Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSelectedDocSource('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedDocSource === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              الكل ({rawRecords.length})
            </button>

            {/* Special Review Queue Pill */}
            <button
              onClick={() => setSelectedDocSource('unconfirmed')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                selectedDocSource === 'unconfirmed'
                  ? 'bg-amber-500 text-black font-bold shadow-xs'
                  : 'text-amber-800 dark:text-amber-300 hover:text-amber-600'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>يحتاج مراجعة ({unconfirmedCount})</span>
            </button>

            <button
              onClick={() => setSelectedDocSource('doc1_ledger')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedDocSource === 'doc1_ledger'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              دفتر مبيعات المكن ({doc1Count})
            </button>

            <button
              onClick={() => setSelectedDocSource('doc2_receipts')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedDocSource === 'doc2_receipts'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              إيصالات التسليم ({doc2Count})
            </button>

            <button
              onClick={() => setSelectedDocSource('matched')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                selectedDocSource === 'matched'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <Link2 className="w-3 h-3 text-emerald-500" />
              <span>متطابق ({matchedCount})</span>
            </button>

            <button
              onClick={() => setSelectedDocSource('confirmed')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                selectedDocSource === 'confirmed'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>معتمد ({confirmedCount})</span>
            </button>
          </div>

          {/* Page & Traffic Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="all">كل الصفحات</option>
              {pageNumbers.map((p) => (
                <option key={p} value={String(p)}>
                  صفحة {p}
                </option>
              ))}
            </select>

            <select
              value={selectedTraffic}
              onChange={(e) => setSelectedTraffic(e.target.value)}
              className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none max-w-[150px]"
            >
              <option value="all">كل إدارات المرور</option>
              {trafficDepartments.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value={25}>25 بالصفحة</option>
              <option value={50}>50 بالصفحة</option>
              <option value={100}>100 بالصفحة</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-Density Records Table */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold select-none">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3">المصدر والموضع</th>
                <th className="py-2.5 px-3 font-mono">رقم المحرك الأساسي</th>
                <th className="py-2.5 px-3">الاحتمالات المرجعية (البدائل)</th>
                <th className="py-2.5 px-3">اسم المشتري / العميل</th>
                <th className="py-2.5 px-3">إدارة المرور</th>
                <th className="py-2.5 px-3">التاجر والتاريخ</th>
                <th className="py-2.5 px-3 text-center">القصاصة البصرية</th>
                <th className="py-2.5 px-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-850 font-sans">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-sm">لا توجد سجلات مطابقة لمعايير البحث</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      جرب تغيير نص البحث أو تفعيل البحث المرن للخلط بين 2 و 3
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, idx) => {
                  const globalIndex = startIndex + idx + 1;
                  const hasAlternates = Boolean(item.candidate2 || item.candidate3);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setActiveModalRecordId(item.id)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                    >
                      {/* Index */}
                      <td className="py-2 px-3 text-center text-zinc-400 text-[11px] font-mono">
                        {globalIndex}
                      </td>

                      {/* Source & Position */}
                      <td className="py-2 px-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                item.sourceDocument === 'doc1_ledger'
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                              }`}
                            >
                              {item.sourceDocument === 'doc1_ledger' ? 'الدفتر 1' : 'الدفتر 2'}
                            </span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              ص {item.pageNumber}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500">{item.rowOrPosition}</span>
                        </div>
                      </td>

                      {/* Primary Engine Number */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            dir="ltr"
                            className="font-mono font-bold text-xs bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white px-2 py-0.5 rounded tracking-wider border border-zinc-200 dark:border-zinc-800"
                          >
                            {item.engineNumber || '—'}
                          </span>
                          {item.indicNumber && (
                            <span className="text-[11px] font-mono text-zinc-400">
                              {item.indicNumber}
                            </span>
                          )}
                          {item.isConfirmed && (
                            <span title="معتمد ومؤكد" className="inline-flex">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reference Alternates (Candidate 2 & 3) */}
                      <td className="py-2 px-3">
                        {hasAlternates ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {item.candidate2 && (
                              <span
                                dir="ltr"
                                className="font-mono text-[10px] bg-amber-500/10 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20"
                                title="احتمال بديل ثانٍ"
                              >
                                {item.candidate2}
                              </span>
                            )}
                            {item.candidate3 && (
                              <span
                                dir="ltr"
                                className="font-mono text-[10px] bg-amber-500/10 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20"
                                title="احتمال بديل ثالث"
                              >
                                {item.candidate3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {item.isConfirmed ? 'مؤكد (تم مسح البدائل)' : '—'}
                          </span>
                        )}
                      </td>

                      {/* Customer / Buyer Name */}
                      <td className="py-2 px-3">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.customerName || '—'}
                        </span>
                        {item.matchedDoc1Customer && item.matchedDoc1Customer !== item.customerName && (
                          <span className="text-[10px] text-zinc-400 block">
                            (الدفتر 1: {item.matchedDoc1Customer})
                          </span>
                        )}
                      </td>

                      {/* Traffic Dept */}
                      <td className="py-2 px-3">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {item.trafficDepartment || '—'}
                        </span>
                      </td>

                      {/* Merchant & Date */}
                      <td className="py-2 px-3 text-[11px]">
                        <div className="flex flex-col text-zinc-500 dark:text-zinc-400">
                          {item.merchantName && (
                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                              {item.merchantName}
                            </span>
                          )}
                          {item.date && <span>{item.date}</span>}
                          {!item.merchantName && !item.date && <span>—</span>}
                        </div>
                      </td>

                      {/* Visual Strip Thumbnail */}
                      <td className="py-1.5 px-3 text-center">
                        <div className="inline-flex items-center justify-center p-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-black group-hover:border-amber-500/50 transition-colors">
                          <img
                            src={item.cropUrl}
                            alt="قصاصة"
                            className="h-7 w-20 object-cover rounded-xs"
                            onError={(e) => {
                              const t = e.target as HTMLElement;
                              t.style.display = 'none';
                            }}
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveModalRecordId(item.id);
                            }}
                            title="معاينة وتكبير القصاصة"
                            className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {hasAlternates && !item.isConfirmed && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickConfirm(item, e)}
                              title="اعتماد هذا الرقم ومسح البدائل"
                              className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>اعتماد</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* High-Density Pagination Bar */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 select-none">
          <div>
            عرض{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {totalItems > 0 ? startIndex + 1 : 0}
            </strong>{' '}
            إلى{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {Math.min(startIndex + pageSize, totalItems)}
            </strong>{' '}
            من إجمالي{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {totalItems.toLocaleString('ar-EG')}
            </strong>{' '}
            سجل
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-zinc-100 transition-colors"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              صفحة {currentPage} من {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-zinc-100 transition-colors"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Crop Modal */}
      {activeModalRecord && (
        <VisualCropModal
          record={activeModalRecord}
          onClose={() => setActiveModalRecordId(null)}
          onUpdateRecord={handleUpdateRecord}
          onNavigatePrev={handleNavigateModalPrev}
          onNavigateNext={handleNavigateModalNext}
          hasPrev={activeModalIndex > 0}
          hasNext={activeModalIndex >= 0 && activeModalIndex < filteredRecords.length - 1}
        />
      )}
    </div>
  );
};
