import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { SalesInvoice, ShopSettings, ClearanceDoc } from '../../types';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  FileCheck2,
} from 'lucide-react';
import { SaleInvoiceModal } from './SaleInvoiceModal';
import { ClearanceDocModal } from '../engines/ClearanceDocModal';
import { CreateSaleModal } from './CreateSaleModal';

interface SalesListProps {
  settings: ShopSettings;
}

export const SalesList: React.FC<SalesListProps> = ({ settings }) => {
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<ClearanceDoc | null>(null);

  const sales = useLiveQuery(() => db.salesInvoices.reverse().sortBy('createdAt')) || [];

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      s.invoiceNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.engineNumber.toLowerCase().includes(q) ||
      s.engineTitle.toLowerCase().includes(q)
    );
  });

  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalPaidCash = sales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalRemainingCredit = sales.reduce((sum, s) => sum + s.remainingAmount, 0);
  const totalProfits = sales.reduce((sum, s) => sum + s.profit, 0);

  const handleOpenEngineDoc = async (engineNumber: string) => {
    const doc = await db.clearanceDocs.where('engineNumber').equals(engineNumber).first();
    if (doc) setViewingDoc(doc);
    else alert(`لا يوجد ورق إفراج محفوظ للمكنة ${engineNumber}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">فواتير مبيعات المواتير</h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {sales.length} فاتورة
            </span>
          </div>
          <span className="text-xs text-slate-400">سجل فواتير البيع والتحصيل النقدي والآجل</span>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>إنشاء فاتورة بيع</span>
        </button>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">إجمالي المبيعات</span>
          <span className="font-mono text-lg font-bold text-slate-900 block mt-0.5">
            {totalSalesRevenue.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">المحصل نقداً</span>
          <span className="font-mono text-lg font-bold text-emerald-700 block mt-0.5">
            {totalPaidCash.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">الآجل المتبقي</span>
          <span className="font-mono text-lg font-bold text-amber-700 block mt-0.5">
            {totalRemainingCredit.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">صافي الأرباح</span>
          <span className="font-mono text-lg font-bold text-purple-700 block mt-0.5">
            +{totalProfits.toLocaleString('en-US')} ج.م
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة، اسم العميل، رقم المكنة، أو الموديل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة والتاريخ</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">المكنة</th>
                <th className="py-3 px-4 text-left">الإجمالي</th>
                <th className="py-3 px-4 text-left">المسدد</th>
                <th className="py-3 px-4 text-left">المتبقي</th>
                <th className="py-3 px-4 text-left">الربح</th>
                <th className="py-3 px-4 text-center">طباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <div>{inv.invoiceNumber}</div>
                    <span className="text-[10px] text-slate-400 font-sans">{inv.date}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{inv.customerPhone}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800">{inv.engineTitle}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {inv.engineNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEngineDoc(inv.engineNumber)}
                        className="text-[10px] text-amber-800 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                      >
                        <FileCheck2 className="w-3 h-3" />
                        ورق الإفراج
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900 text-sm">
                    {inv.finalAmount.toLocaleString('en-US')} ج.م
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono font-bold text-emerald-700">
                    {inv.paidAmount.toLocaleString('en-US')} ج.م
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono">
                    {inv.remainingAmount === 0 ? (
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                        خالص
                      </span>
                    ) : (
                      <span className="font-bold text-amber-700">
                        {inv.remainingAmount.toLocaleString('en-US')} ج.م
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-left font-mono font-bold text-purple-700">
                    +{inv.profit.toLocaleString('en-US')} ج.م
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
                      title="عرض وطباعة"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    لا توجد فواتير مبيعات مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && (
        <SaleInvoiceModal
          invoice={selectedInvoice}
          settings={settings}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {viewingDoc && (
        <ClearanceDocModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}

      <CreateSaleModal
        isOpen={isCreateOpen}
        settings={settings}
        onClose={() => setIsCreateOpen(false)}
        onSaleCreated={(newInv) => setSelectedInvoice(newInv)}
      />
    </div>
  );
};
