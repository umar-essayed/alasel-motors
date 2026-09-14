import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { SalesInvoice, ShopSettings, ClearanceDoc } from '../../types';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  FileCheck2,
  DollarSign,
  TrendingUp,
  Clock,
  Printer,
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
  
  // Customs doc preview for sold engine
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
    if (doc) {
      setViewingDoc(doc);
    } else {
      alert(`لا يوجد ورق إفراج جمركي محفوظ برقم المكنة ${engineNumber}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Financial Highlights */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                فواتير مبيعات المواتير
              </h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {sales.length} فاتورة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              سجل المبيعات، التحصيل النقدي، الآجل المتبقي، وصافي أرباح كل مكنة مباعة
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>إنشاء فاتورة بيع جديدة</span>
          </button>
        </div>

        {/* 4 Financial metric badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي المبيعات</span>
            <span className="text-lg sm:text-xl font-bold text-slate-900">
              {totalSalesRevenue.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-emerald-800 block">المحصل نقداً في الخزينة</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-950">
              {totalPaidCash.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-amber-800 block">الآجل المتبقي بالخارج</span>
            <span className="text-lg sm:text-xl font-bold text-amber-950">
              {totalRemainingCredit.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
          <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-purple-800 block">صافي أرباح المبيعات</span>
            <span className="text-lg sm:text-xl font-bold text-purple-950 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              {totalProfits.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة، اسم العميل، رقم المكنة، الموديل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد فواتير مبيعات مسجلة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-4">رقم وتاريخ الفاتورة</th>
                  <th className="py-3 px-4">العميل والمشتري</th>
                  <th className="py-3 px-4">المكنة ورقم المحرك</th>
                  <th className="py-3 px-4 text-left">قيمة الفاتورة</th>
                  <th className="py-3 px-4 text-left">المسدد (كاش)</th>
                  <th className="py-3 px-4 text-left">الآجل المتبقي</th>
                  <th className="py-3 px-4 text-left">صافي الربح</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredSales.map((inv) => {
                  const isFullyPaid = inv.remainingAmount === 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">{inv.date}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{inv.customerName}</span>
                        <span className="text-[11px] text-slate-500">{inv.customerPhone}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 block truncate max-w-[200px]">
                          {inv.engineTitle}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                            {inv.engineNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEngineDoc(inv.engineNumber)}
                            className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5 underline cursor-pointer"
                            title="عرض ورق الإفراج الجمركي للمكنة"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            ورق الإفراج
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900 text-sm">
                        {inv.finalAmount.toLocaleString('ar-EG')} ج.م
                      </td>

                      <td className="py-3.5 px-4 text-left font-mono font-bold text-emerald-700">
                        {inv.paidAmount.toLocaleString('ar-EG')} ج.م
                      </td>

                      <td className="py-3.5 px-4 text-left font-mono">
                        {isFullyPaid ? (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                            خالص بالكامل
                          </span>
                        ) : (
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                            {inv.remainingAmount.toLocaleString('ar-EG')} ج.م
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-left font-mono font-bold text-purple-700">
                        +{inv.profit.toLocaleString('ar-EG')} ج.م
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>عرض وطباعة</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <SaleInvoiceModal
          invoice={selectedInvoice}
          settings={settings}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Customs Doc Modal */}
      {viewingDoc && (
        <ClearanceDocModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {/* Create Sale Modal */}
      <CreateSaleModal
        isOpen={isCreateOpen}
        settings={settings}
        onClose={() => setIsCreateOpen(false)}
        onSaleCreated={(newInv) => {
          setSelectedInvoice(newInv);
        }}
      />
    </div>
  );
};
