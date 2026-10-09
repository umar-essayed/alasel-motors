import React, { useState } from 'react';
import { Engine } from '../types';
import { Search, Car, Tag, CheckCircle2, Clock, AlertCircle, Eye, Phone, MapPin } from 'lucide-react';

interface MobileEnginesViewProps {
  engines: Engine[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const MobileEnginesView: React.FC<MobileEnginesViewProps> = ({ engines, onRefresh, isLoading }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'sold'>('available');
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);

  const filtered = engines.filter((eng) => {
    const matchesSearch =
      eng.engineNumber.toLowerCase().includes(search.toLowerCase()) ||
      eng.category.toLowerCase().includes(search.toLowerCase()) ||
      eng.carModels.toLowerCase().includes(search.toLowerCase()) ||
      (eng.supplierName && eng.supplierName.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return eng.status === filterStatus;
  });

  return (
    <div className="space-y-3 pb-24">
      {/* Search Bar */}
      <div className="sticky top-14 z-20 bg-black/95 backdrop-blur-md pt-1 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم المكنة، الموديل، النوع، المورد..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400"
            >
              مسح
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setFilterStatus('available')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterStatus === 'available'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850'
            }`}
          >
            المتاح بالمخزن ({engines.filter((e) => e.status === 'available').length})
          </button>
          <button
            onClick={() => setFilterStatus('sold')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterStatus === 'sold'
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850'
            }`}
          >
            المباع ({engines.filter((e) => e.status === 'sold').length})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterStatus === 'all'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850'
            }`}
          >
            الكل ({engines.length})
          </button>
        </div>
      </div>

      {/* Engines List (Card Layout for 100% Mobile Clean Density) */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 text-xs">
            {isLoading ? 'جارٍ تحميل البيانات من السحابة...' : 'لا توجد محركات مطابقة للبحث'}
          </div>
        ) : (
          filtered.map((engine) => (
            <div
              key={engine.id}
              onClick={() => setSelectedEngine(engine)}
              className="bg-zinc-950 border border-zinc-850 active:border-zinc-700 p-3.5 rounded-xl space-y-2.5 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-amber-400 tracking-wide">
                      {engine.engineNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        engine.status === 'available'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : engine.status === 'sold'
                          ? 'bg-zinc-850 text-zinc-400 border border-zinc-800'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {engine.status === 'available' ? 'متاح' : engine.status === 'sold' ? 'مباع' : engine.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-100 mt-1">{engine.category}</h4>
                  <p className="text-[11px] text-zinc-400">{engine.carModels}</p>
                </div>

                <div className="text-left font-mono shrink-0">
                  <span className="text-sm font-bold text-emerald-400 block">
                    {engine.salePrice?.toLocaleString()} ج.م
                  </span>
                  {engine.purchasePrice && (
                    <span className="text-[10px] text-zinc-500 block">
                      جملة: {engine.purchasePrice.toLocaleString()} ج.م
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="truncate max-w-[180px]">
                  {engine.supplierName ? `المورد: ${engine.supplierName}` : 'بدون مورد'}
                </span>
                <span className="font-mono text-[10px]">
                  {engine.createdAt ? engine.createdAt.slice(0, 10) : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Engine Detail Modal */}
      {selectedEngine && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div>
                <span className="text-[10px] text-zinc-400 block">تفاصيل المحرك</span>
                <h3 className="text-base font-bold font-mono text-amber-400">
                  {selectedEngine.engineNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEngine(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-black border border-zinc-850 p-3 rounded-xl">
                <div>
                  <span className="text-zinc-500 block text-[10px]">النوع / التصنيف</span>
                  <span className="font-bold text-zinc-100">{selectedEngine.category}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">يركب على سيارات</span>
                  <span className="font-bold text-zinc-100">{selectedEngine.carModels}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-black border border-zinc-850 p-3 rounded-xl font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px]">سعر البيع</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {selectedEngine.salePrice?.toLocaleString()} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">سعر الشراء (الجملة)</span>
                  <span className="font-bold text-zinc-300 text-sm">
                    {selectedEngine.purchasePrice ? `${selectedEngine.purchasePrice.toLocaleString()} ج.م` : 'غير محدد'}
                  </span>
                </div>
              </div>

              <div className="bg-black border border-zinc-850 p-3 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">المورد:</span>
                  <span className="font-semibold text-zinc-200">{selectedEngine.supplierName || 'غير مسجل'}</span>
                </div>
                {selectedEngine.customerName && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">العميل المشتري:</span>
                    <span className="font-semibold text-amber-400">{selectedEngine.customerName}</span>
                  </div>
                )}
                {selectedEngine.specs && (
                  <div className="pt-2 border-t border-zinc-900">
                    <span className="text-zinc-500 block mb-1">المواصفات:</span>
                    <p className="text-zinc-300 leading-relaxed">{selectedEngine.specs}</p>
                  </div>
                )}
                {selectedEngine.notes && (
                  <div className="pt-2 border-t border-zinc-900">
                    <span className="text-zinc-500 block mb-1">ملاحظات:</span>
                    <p className="text-zinc-400">{selectedEngine.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedEngine(null)}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
