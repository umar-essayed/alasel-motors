import React, { useState } from 'react';
import { SalesInvoice } from '../types';
import { Search, Receipt, Calendar, User, FileText, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';

interface MobileInvoicesViewProps {
  invoices: SalesInvoice[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const MobileInvoicesView: React.FC<MobileInvoicesViewProps> = ({ invoices, onRefresh, isLoading }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'completed'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.engineNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerPhone && inv.customerPhone.includes(search));

    if (!matchesSearch) return false;
    if (filterType === 'credit') return (inv.remainingAmount || 0) > 0;
    if (filterType === 'completed') return (inv.remainingAmount || 0) === 0;
    return true;
  });

  return (
    <div className="space-y-3 pb-24">
      {/* Search Header */}
      <div className="sticky top-14 z-20 bg-black/95 backdrop-blur-md pt-1 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة، العميل، رقم المكنة، الهاتف..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterType === 'all'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850'
            }`}
          >
            جميع الفواتير ({invoices.length})
          </button>
          <button
            onClick={() => setFilterType('credit')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterType === 'credit'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850'
            }`}
          >
            فواتير الآجل ({invoices.filter((i) => (i.remainingAmount || 0) > 0).length})
          </button>
          <button
            onClick={() => setFilterType('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              filterType === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850'
            }`}
          >
            خالصة ({invoices.filter((i) => (i.remainingAmount || 0) === 0).length})
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 text-xs">
            {isLoading ? 'جارٍ تحميل الفواتير من السحابة...' : 'لا توجد فواتير مطابقة'}
          </div>
        ) : (
          filtered.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setSelectedInvoice(inv)}
              className="bg-zinc-950 border border-zinc-850 active:border-zinc-700 p-3.5 rounded-xl space-y-2.5 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-white">
                      #{inv.invoiceNumber}
                    </span>
                    {inv.status === 'returned' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        مرتجع
                      </span>
                    )}
                    {inv.remainingAmount > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        باقي: {inv.remainingAmount.toLocaleString()} ج.م
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400">
                        مدفوع كاش
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-zinc-200 mt-1">{inv.customerName}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                    <span>مكنة: {inv.engineNumber}</span>
                    <span>•</span>
                    <span>{inv.engineCategory}</span>
                  </div>
                </div>

                <div className="text-left font-mono shrink-0">
                  <span className="text-sm font-bold text-emerald-400 block">
                    {inv.totalAmount?.toLocaleString()} ج.م
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    مسدد: {inv.paidAmount?.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Clearance status badge */}
              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-400">
                    ورق التخليص:
                  </span>
                  <span className={`font-semibold ${
                    inv.clearanceStatus === 'delivered' 
                      ? 'text-emerald-400' 
                      : 'text-amber-400'
                  }`}>
                    {inv.clearanceStatus === 'delivered' ? 'تم التسليم' : 'قيد الانتظار'}
                  </span>
                </div>
                <span className="text-zinc-500 font-mono text-[10px]">
                  {inv.saleDate || inv.createdAt?.slice(0, 10)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invoice Detail Bottom Sheet / Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div>
                <span className="text-[10px] text-zinc-400 block">تفاصيل الفاتورة</span>
                <h3 className="text-base font-bold font-mono text-white">
                  فاتورة #{selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-black border border-zinc-850 p-3 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">اسم العميل:</span>
                  <span className="font-bold text-zinc-100">{selectedInvoice.customerName}</span>
                </div>
                {selectedInvoice.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">رقم الهاتف:</span>
                    <span className="font-mono text-zinc-300">{selectedInvoice.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">تاريخ البيع:</span>
                  <span className="font-mono text-zinc-300">{selectedInvoice.saleDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">الموظف / الكاشير:</span>
                  <span className="text-zinc-300">{selectedInvoice.cashierName}</span>
                </div>
              </div>

              <div className="bg-black border border-zinc-850 p-3 rounded-xl space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">المحرك المباع:</span>
                  <span className="font-bold text-amber-400">{selectedInvoice.engineNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">الإجمالي:</span>
                  <span className="font-bold text-white">{selectedInvoice.totalAmount?.toLocaleString()} ج.م</span>
                </div>
                {selectedInvoice.discountAmount ? (
                  <div className="flex justify-between text-rose-400">
                    <span className="font-sans">الخصم:</span>
                    <span>-{selectedInvoice.discountAmount.toLocaleString()} ج.م</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-emerald-400">
                  <span className="font-sans">المدفوع:</span>
                  <span className="font-bold">{selectedInvoice.paidAmount?.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-amber-400 pt-1 border-t border-zinc-900">
                  <span className="font-sans">المتبقي (الآجل):</span>
                  <span className="font-bold">{selectedInvoice.remainingAmount?.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Clearance Documentation Section */}
              <div className="bg-zinc-900/50 border border-zinc-850 p-3 rounded-xl space-y-1.5">
                <h5 className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  موقف ورق التخليص الجمركي
                </h5>
                <div className="flex justify-between">
                  <span className="text-zinc-500">حالة التسليم:</span>
                  <span className={`font-semibold ${selectedInvoice.clearanceStatus === 'delivered' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedInvoice.clearanceStatus === 'delivered' ? 'تم التسليم للمشتري' : 'لم يستلم الورق بعد'}
                  </span>
                </div>
                {selectedInvoice.clearanceDeliveredTo && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">المستلم:</span>
                    <span className="text-zinc-200">{selectedInvoice.clearanceDeliveredTo}</span>
                  </div>
                )}
                {selectedInvoice.trafficDepartment && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">وحدة المرور:</span>
                    <span className="text-zinc-200">{selectedInvoice.trafficDepartment}</span>
                  </div>
                )}
                {selectedInvoice.clearanceDeliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">تاريخ التسليم:</span>
                    <span className="font-mono text-zinc-300">{selectedInvoice.clearanceDeliveredAt}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedInvoice(null)}
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
