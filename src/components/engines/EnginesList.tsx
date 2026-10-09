import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Engine, ClearanceDoc } from '../../types';
import { exportToCsv } from '../../utils/exportUtils';
import {
  Cpu,
  Plus,
  Search,
  Trash2,
  Edit2,
  FileCheck2,
  ShoppingCart,
  Upload,
  Download,
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
    if (window.confirm(`تأكيد حذف المحرك (${eng.engineNumber})؟`)) {
      await db.engines.delete(eng.id);
      if (eng.hasClearanceDoc) {
        await db.clearanceDocs.where('engineNumber').equals(eng.engineNumber).delete();
      }
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'رقم المحرك',
      'الماركة',
      'الموديل',
      'سعر الشراء',
      'مصاريف إضافية',
      'سعر البيع',
      'الحالة',
      'المورد',
      'ورقة إفراج جمركي',
    ];

    const rows = filtered.map((e) => [
      e.engineNumber,
      e.carBrand,
      e.carModel,
      e.costPrice,
      e.additionalCost,
      e.sellingPrice,
      e.status === 'available' ? 'متاح' : e.status === 'sold' ? 'مباع' : 'مرتجع',
      e.supplierName || '—',
      e.hasClearanceDoc ? 'نعم' : 'لا',
    ]);

    exportToCsv('مخزن_محركات_الوكالة', headers, rows);
  };

  return (
    <div className="space-y-3">
      {/* Action Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900">مخزن المحركات</h2>
              <span className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-semibold">
                {availableCount} متاح
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">إجمالي المخزون: {engines.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-zinc-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير إكسيل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingEngine(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة محرك</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="بحث برقم المحرك، الماركة، أو الموديل..."
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg text-xs font-medium shrink-0">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              selectedStatus === 'all' ? 'bg-white text-zinc-900 font-semibold shadow-xs' : 'text-zinc-600'
            }`}
          >
            الكل ({engines.length})
          </button>
          <button
            onClick={() => setSelectedStatus('available')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              selectedStatus === 'available' ? 'bg-white text-zinc-900 font-semibold shadow-xs' : 'text-zinc-600'
            }`}
          >
            متاح ({availableCount})
          </button>
          <button
            onClick={() => setSelectedStatus('sold')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              selectedStatus === 'sold' ? 'bg-white text-zinc-900 font-semibold shadow-xs' : 'text-zinc-600'
            }`}
          >
            مباع ({soldCount})
          </button>
        </div>

        <select
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:bg-white focus:outline-none shrink-0"
        >
          <option value="all">كل الأوراق</option>
          <option value="with_doc">بورق إفراج</option>
          <option value="without_doc">بدون ورق إفراج</option>
        </select>
      </div>

      {/* High-Density Engines Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">رقم المحرك</th>
                <th className="py-2.5 px-4">الماركة والموديل</th>
                <th className="py-2.5 px-4 text-left">التكلفة</th>
                <th className="py-2.5 px-4 text-left">سعر البيع</th>
                <th className="py-2.5 px-4 text-center">ورق الإفراج</th>
                <th className="py-2.5 px-4 text-center">الحالة</th>
                <th className="py-2.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((eng) => {
                const isAvailable = eng.status === 'available';

                return (
                  <tr key={eng.id} className="hover:bg-zinc-50/80 transition-colors">
                    {/* Engine Number */}
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-bold text-zinc-900 text-xs block select-all">
                        {eng.engineNumber}
                      </span>
                      {eng.modelYear && <span className="text-[10px] text-zinc-400">{eng.modelYear}</span>}
                    </td>

                    {/* Brand & Model */}
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-zinc-900 block">{eng.carBrand}</span>
                      <span className="text-zinc-500 text-[11px]">{eng.carModel}</span>
                    </td>

                    {/* Cost */}
                    <td className="py-2.5 px-4 text-left font-mono text-zinc-600 font-medium">
                      {(eng.costPrice + eng.additionalCost).toLocaleString('en-US')} ج.م
                    </td>

                    {/* Selling Price */}
                    <td className="py-2.5 px-4 text-left font-mono font-bold text-zinc-900">
                      {eng.sellingPrice.toLocaleString('en-US')} ج.م
                    </td>

                    {/* Customs Clearance Doc Button */}
                    <td className="py-2.5 px-4 text-center">
                      {eng.hasClearanceDoc ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDoc(eng)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          <FileCheck2 className="w-3 h-3 text-zinc-600" />
                          <span>معاينة</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDoc(eng)}
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-700 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>إرفاق</span>
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-4 text-center">
                      {isAvailable ? (
                        <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          متاح
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                          مباع
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isAvailable && (
                          <button
                            type="button"
                            onClick={() => onSellEngine(eng)}
                            className="p-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded transition-colors cursor-pointer"
                            title="بيع المحرك"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEngine(eng);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(eng)}
                          className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
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
                  <td colSpan={7} className="py-8 text-center text-zinc-400 text-xs">
                    لا توجد محركات مسجلة
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
