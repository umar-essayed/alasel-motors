import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Engine, ClearanceDoc } from '../../types';
import {
  Cpu,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  FileCheck2,
  ShoppingCart,
  Upload,
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
  const [docFilter, setDocFilter] = useState<string>('all');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEngine, setEditingEngine] = useState<Engine | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ClearanceDoc | null>(null);
  const [viewingEngine, setViewingEngine] = useState<Engine | null>(null);

  const engines = useLiveQuery(() => db.engines.reverse().sortBy('createdAt')) || [];
  const searchQuery = externalSearchQuery || internalSearch;

  const filtered = engines.filter((eng) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      eng.engineNumber.toLowerCase().includes(q) ||
      eng.carBrand.toLowerCase().includes(q) ||
      eng.carModel.toLowerCase().includes(q) ||
      (eng.customerName && eng.customerName.toLowerCase().includes(q));

    const matchesStatus = selectedStatus === 'all' || eng.status === selectedStatus;
    const matchesDoc =
      docFilter === 'all' ||
      (docFilter === 'with_doc' && eng.hasClearanceDoc) ||
      (docFilter === 'without_doc' && !eng.hasClearanceDoc);

    return matchesSearch && matchesStatus && matchesDoc;
  });

  const availableCount = engines.filter((e) => e.status === 'available').length;
  const soldCount = engines.filter((e) => e.status === 'sold').length;

  const handleOpenDoc = async (eng: Engine) => {
    if (!eng.hasClearanceDoc) {
      setEditingEngine(eng);
      setIsFormModalOpen(true);
      return;
    }
    const doc = await db.clearanceDocs.where('engineNumber').equals(eng.engineNumber).first();
    if (doc) {
      setViewingDoc(doc);
      setViewingEngine(eng);
    }
  };

  const handleDelete = async (eng: Engine) => {
    if (window.confirm(`حذف المكنة (${eng.engineNumber}) من المخزن؟`)) {
      await db.engines.delete(eng.id);
      if (eng.hasClearanceDoc) {
        await db.clearanceDocs.where('engineNumber').equals(eng.engineNumber).delete();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900">مخزن مواتير السيارات</h2>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {availableCount} متاح للبيع
              </span>
            </div>
            <span className="text-xs text-slate-400">إجمالي المخزن: {engines.length} مكنة</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingEngine(null);
            setIsFormModalOpen(true);
          }}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>إضافة مكنة جديدة</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث برقم المكنة المدموغ، الماركة، أو الموديل..."
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            الكل ({engines.length})
          </button>
          <button
            onClick={() => setSelectedStatus('available')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'available' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            متاح ({availableCount})
          </button>
          <button
            onClick={() => setSelectedStatus('sold')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedStatus === 'sold' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            مباع ({soldCount})
          </button>
        </div>

        <select
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none shrink-0"
        >
          <option value="all">كل الأوراق</option>
          <option value="with_doc">بورق إفراج</option>
          <option value="without_doc">بدون ورق إفراج</option>
        </select>
      </div>

      {/* Clean Engines Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-4 px-5">رقم المكنة المدموغ</th>
                <th className="py-4 px-5">الماركة والموديل</th>
                <th className="py-4 px-5">المواصفات والفتيس</th>
                <th className="py-4 px-5 text-left">سعر التكلفة</th>
                <th className="py-4 px-5 text-left">سعر البيع</th>
                <th className="py-4 px-5 text-center">ورق الإفراج</th>
                <th className="py-4 px-5 text-center">الحالة</th>
                <th className="py-4 px-5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((eng) => {
                const isAvailable = eng.status === 'available';

                return (
                  <tr key={eng.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Engine Number */}
                    <td className="py-4 px-5">
                      <span className="font-mono font-extrabold text-slate-900 text-sm block select-all">
                        {eng.engineNumber}
                      </span>
                      <span className="text-xs text-slate-400">{eng.modelYear || 'موديل قياسي'}</span>
                    </td>

                    {/* Brand & Model */}
                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-900 text-sm block">{eng.carBrand}</span>
                      <span className="text-slate-600 text-xs">{eng.carModel}</span>
                    </td>

                    {/* Specs */}
                    <td className="py-4 px-5 text-slate-600 text-xs">
                      <span className="font-semibold text-slate-700">{eng.engineCapacity || '1600cc'}</span>
                      <span className="text-slate-400 block text-xs">{eng.transmissionType}</span>
                    </td>

                    {/* Wholesale Cost */}
                    <td className="py-4 px-5 text-left font-mono text-slate-700 font-semibold text-sm">
                      {(eng.costPrice + eng.additionalCost).toLocaleString('en-US')} ج.م
                    </td>

                    {/* Selling Price */}
                    <td className="py-4 px-5 text-left font-mono font-extrabold text-slate-900 text-base">
                      {eng.sellingPrice.toLocaleString('en-US')} ج.م
                    </td>

                    {/* Customs Clearance Doc Button */}
                    <td className="py-4 px-5 text-center">
                      {eng.hasClearanceDoc ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDoc(eng)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                          title="عرض وطباعة ورقة الإفراج"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>معاينة الإفراج</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDoc(eng)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded-lg cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>رفع ورق</span>
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {isAvailable ? (
                        <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          متاح
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          تم البيع
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isAvailable && (
                          <button
                            type="button"
                            onClick={() => onSellEngine(eng)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                            title="بيع المكنة"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEngine(eng);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(eng)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    لا توجد مواتير مسجلة تطابق البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      <EngineFormModal
        isOpen={isFormModalOpen}
        engine={editingEngine}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEngine(null);
        }}
        onSaved={() => {}}
      />
    </div>
  );
};
