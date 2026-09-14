import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TabType } from '../layout/Sidebar';
import {
  Cpu,
  WalletCards,
  Users,
  Truck,
  ShoppingCart,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenNewEngineModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onOpenNewEngineModal,
}) => {
  const engines = useLiveQuery(() => db.engines.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];
  const sales = useLiveQuery(() => db.salesInvoices.reverse().sortBy('createdAt')) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const availableEngines = engines.filter((e) => e.status === 'available');

  const totalWholesaleValue = availableEngines.reduce(
    (sum, e) => sum + e.costPrice + e.additionalCost,
    0
  );

  const totalCustomerDebt = customers.reduce((sum, c) => sum + c.balance, 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + s.balance, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentCash = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            لوحة العمليات الرئيسية
          </h2>
          <span className="text-xs text-slate-500">نظام الأصيل لمواتير ومكن السيارات</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('pos')}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <span>فتح شاشة البيع (POS)</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewEngineModal}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer border border-slate-300"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مكنة</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Stock */}
        <div
          onClick={() => onNavigateTab('engines')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">مخزن المواتير المتاحة</span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </div>
          <span className="font-mono text-2xl font-bold text-slate-900 block">
            {availableEngines.length} مكنة
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            قيمة التكلفة: {totalWholesaleValue.toLocaleString('en-US')} ج.م
          </span>
        </div>

        {/* Treasury */}
        <div
          onClick={() => onNavigateTab('treasury')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">رصيد الخزينة (الدرج)</span>
            <WalletCards className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-mono text-2xl font-bold text-emerald-700 block">
            {currentCash.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">نقدية فعلية حاضرة</span>
        </div>

        {/* Customer Receivables */}
        <div
          onClick={() => onNavigateTab('customers')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">آجل العملاء (بالخارج)</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <span className="font-mono text-2xl font-bold text-amber-700 block">
            {totalCustomerDebt.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            على {customers.filter((c) => c.balance > 0).length} عميل
          </span>
        </div>

        {/* Supplier Dues */}
        <div
          onClick={() => onNavigateTab('suppliers')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">مستحقات الموردين</span>
            <Truck className="w-4 h-4 text-rose-600" />
          </div>
          <span className="font-mono text-2xl font-bold text-rose-700 block">
            {totalSupplierDebt.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">متبقي لمكاتب الاستيراد</span>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">آخر فواتير البيع الصادرة</h3>
          <button
            type="button"
            onClick={() => onNavigateTab('sales')}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>كل الفواتير</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">المكنة والموديل</th>
                <th className="py-3 px-4 text-left">الإجمالي</th>
                <th className="py-3 px-4 text-left">المسدد كاش</th>
                <th className="py-3 px-4 text-left">المتبقي آجل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{inv.customerName}</td>
                  <td className="py-3 px-4 text-slate-700">{inv.engineTitle}</td>
                  <td className="py-3 px-4 text-left font-mono font-bold text-slate-900">
                    {inv.finalAmount.toLocaleString('en-US')} ج.م
                  </td>
                  <td className="py-3 px-4 text-left font-mono font-bold text-emerald-700">
                    {inv.paidAmount.toLocaleString('en-US')} ج.م
                  </td>
                  <td className="py-3 px-4 text-left font-mono">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
