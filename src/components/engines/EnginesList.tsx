import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Engine, ClearanceDoc } from '../../types';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  FileCheck2,
  FileX2,
  CheckCircle,
  Clock,
  CheckCheck,
  Edit2,
  Trash2,
  Eye,
  ShoppingCart,
  Upload,
  Sparkles,
} from 'lucide-react';
import { ClearanceDocModal } from './ClearanceDocModal';
import { EngineFormModal } from './EngineFormModal';

interface EnginesListProps {
  onSellEngine: (engine: Engine) => void;
  externalSearchQuery?: string;
}

export const EnginesList: React.FC<EnginesListProps> = ({
  onSellEngine,
  externalSearchQuery = '',
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [docFilter, setDocFilter] = useState<string>('all'); // all, with_doc, without_doc

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEngine, setEditingEngine] = useState<Engine | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ClearanceDoc | null>(null);
  const [viewingEngine, setViewingEngine] = useState<Engine | null>(null);

  // Live Query from IndexedDB
  const engines = useLiveQuery(() => db.engines.reverse().sortBy('createdAt')) || [];

  const searchQuery = externalSearchQuery || internalSearch;

  // Filter engines
  const filteredEngines = engines.filter((eng) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      eng.engineNumber.toLowerCase().includes(q) ||
      eng.carBrand.toLowerCase().includes(q) ||
      eng.carModel.toLowerCase().includes(q) ||
      (eng.customerName && eng.customerName.toLowerCase().includes(q));

    const matchesStatus =
      selectedStatus === 'all' || eng.status === selectedStatus;

    const matchesBrand =
      selectedBrand === 'all' || eng.carBrand.includes(selectedBrand);

    const matchesDoc =
      docFilter === 'all' ||
      (docFilter === 'with_doc' && eng.hasClearanceDoc) ||
      (docFilter === 'without_doc' && !eng.hasClearanceDoc);

    return matchesSearch && matchesStatus && matchesBrand && matchesDoc;
  });

  const availableCount = engines.filter((e) => e.status === 'available').length;
  const soldCount = engines.filter((e) => e.status === 'sold').length;
  const withDocCount = engines.filter((e) => e.hasClearanceDoc).length;

  const totalWholesaleValue = engines
    .filter((e) => e.status === 'available')
    .reduce((sum, e) => sum + e.costPrice + e.additionalCost, 0);

  const totalRetailValue = engines
    .filter((e) => e.status === 'available')
    .reduce((sum, e) => sum + e.sellingPrice, 0);

  const handleOpenDoc = async (eng: Engine) => {
    if (!eng.hasClearanceDoc) {
      // Open edit modal to upload doc
      setEditingEngine(eng);
      setIsFormModalOpen(true);
      return;
    }
    const doc = await db.clearanceDocs.where('engineNumber').equals(eng.engineNumber).first();
    if (doc) {
      setViewingDoc(doc);
      setViewingEngine(eng);
    } else {
      alert('لم يتم العثور على صورة الورق المخزنة لهذا المحرك');
    }
  };

  const handleDeleteEngine = async (eng: Engine) => {
    if (window.confirm(`هل أنت متأكد من حذف المكنة رقم (${eng.engineNumber}) نهائياً من المخزن؟`)) {
      await db.engines.delete(eng.id);
      if (eng.hasClearanceDoc) {
        await db.clearanceDocs.where('engineNumber').equals(eng.engineNumber).delete();
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Quick Stats Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                مخزن مكن ومواتير السيارات
              </h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {engines.length} مكنة مسجلة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              متابعة أرقام المحركات، أسعار الجملة والبيع، وأوراق التخليص والإفراج الجمركي
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingEngine(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>إضافة مكنة جديدة</span>
          </button>
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-emerald-800 block">المتاح للبيع بالمخزن</span>
            <span className="text-xl font-bold text-emerald-950">{availableCount} مكنة</span>
          </div>
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-blue-800 block">إجمالي المباع</span>
            <span className="text-xl font-bold text-blue-950">{soldCount} مكنة</span>
          </div>
          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-amber-800 block">بورق إفراج جمركي</span>
            <span className="text-xl font-bold text-amber-950">{withDocCount} مكنة</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-slate-600 block">قيمة المخزن (جملة)</span>
            <span className="text-lg font-bold text-slate-900">{totalWholesaleValue.toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث برقم المكنة، الماركة (هيونداي، كيا)، الموديل..."
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                selectedStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({engines.length})
            </button>
            <button
              onClick={() => setSelectedStatus('available')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                selectedStatus === 'available' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              متاح بالمخزن ({availableCount})
            </button>
            <button
              onClick={() => setSelectedStatus('sold')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                selectedStatus === 'sold' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              المباع ({soldCount})
            </button>
          </div>

          {/* Customs Doc Filter */}
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">كل الأوراق الجمركية</option>
            <option value="with_doc">بورق إفراج جمركي فقط</option>
            <option value="without_doc">بدون ورق إفراج</option>
          </select>
        </div>
      </div>

      {/* Engines Grid / List */}
      {filteredEngines.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Cpu className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-800 mb-1">
            لا توجد مواتير تطابق نتائج البحث
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            تأكد من كتابة رقم المكنة أو الماركة بشكل صحيح، أو قم بإضافة مكنة جديدة للمخزن.
          </p>
          <button
            onClick={() => {
              setEditingEngine(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>إضافة مكنة الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEngines.map((eng) => {
            const isAvailable = eng.status === 'available';
            const totalCost = eng.costPrice + eng.additionalCost;
            const profit = eng.sellingPrice - totalCost;

            return (
              <div
                key={eng.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Brand & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block">
                        {eng.carBrand}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">
                        {eng.carModel}
                      </h3>
                    </div>

                    {/* Status Pill */}
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>متاح بالمخزن</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                        <CheckCheck className="w-3 h-3 text-blue-600" />
                        <span>تم البيع</span>
                      </span>
                    )}
                  </div>

                  {/* Engine Number Highlight Box */}
                  <div className="bg-slate-900 text-white rounded-xl p-3 mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">
                        رقم المكنة المدموغ (Engine No.)
                      </span>
                      <span className="font-mono text-base font-extrabold tracking-wider text-slate-100 select-all">
                        {eng.engineNumber}
                      </span>
                    </div>
                    <Cpu className="w-5 h-5 text-slate-600 shrink-0" />
                  </div>

                  {/* Engine Specs */}
                  <div className="space-y-1 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">سنة الصنع والسعة:</span>
                      <span className="font-bold text-slate-800">{eng.modelYear || 'غير محدد'} • {eng.engineCapacity || 'قياسي'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الفتيس:</span>
                      <span className="font-medium text-slate-700">{eng.transmissionType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الحالة:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[180px]">{eng.condition}</span>
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 mb-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">سعر الجملة (التكلفة)</span>
                      <span className="font-bold text-slate-800 font-mono text-sm">
                        {totalCost.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">سعر البيع المطلوب</span>
                      <span className="font-bold text-emerald-700 font-mono text-sm">
                        {eng.sellingPrice.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                  </div>

                  {/* Customs Doc Pill Button */}
                  <div className="mb-4">
                    {eng.hasClearanceDoc ? (
                      <button
                        type="button"
                        onClick={() => handleOpenDoc(eng)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <FileCheck2 className="w-4 h-4 text-amber-600" />
                        <span>معاينة وطباعة الإفراج الجمركي للمكنة</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenDoc(eng)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>رفع أوراق الإفراج الجمركي</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEngine(eng);
                        setIsFormModalOpen(true);
                      }}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="تعديل بيانات المكنة"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEngine(eng)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف من المخزن"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {isAvailable ? (
                    <button
                      type="button"
                      onClick={() => onSellEngine(eng)}
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>بيع المكنة الآن</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium">
                      مباعة لـ: {eng.customerName || 'عميل'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clearance Document Modal */}
      {viewingDoc && (
        <ClearanceDocModal
          doc={viewingDoc}
          engine={viewingEngine}
          onClose={() => {
            setViewingDoc(null);
            setViewingEngine(null);
          }}
        />
      )}

      {/* Engine Add/Edit Modal */}
      <EngineFormModal
        isOpen={isFormModalOpen}
        engine={editingEngine}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEngine(null);
        }}
        onSaved={() => {
          // LiveQuery auto-refreshes
        }}
      />
    </div>
  );
};
