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
  ArrowLeft,
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
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl p-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900">نظرة عامة على النشاط</h2>
          <span className="text-[11px] text-zinc-400">ملخص المخزون والسيولة والعمليات اليومية</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('pos')}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>نقطة البيع</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewEngineModal}
            className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer border border-zinc-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة محرك</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigateTab('engines')}
          className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-3.5 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-500">المحركات المتاحة</span>
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <span className="font-mono text-xl font-bold text-zinc-900 block">
            {availableEngines.length} محرك
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            تكلفة المخزون: {totalWholesaleValue.toLocaleString('en-US')} ج.م
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('treasury')}
          className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-3.5 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-500">السيولة النقدية</span>
            <WalletCards className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <span className="font-mono text-xl font-bold text-zinc-900 block">
            {currentCash.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">رصيد الدرج الحالي</span>
        </div>

        <div
          onClick={() => onNavigateTab('customers')}
          className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-3.5 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-500">آجل العملاء</span>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <span className="font-mono text-xl font-bold text-amber-700 block">
            {totalCustomerDebt.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            على {customers.filter((c) => c.balance > 0).length} عميل
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('suppliers')}
          className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-3.5 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-500">مستحقات الموردين</span>
            <Truck className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <span className="font-mono text-xl font-bold text-zinc-900 block">
            {totalSupplierDebt.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">متبقي سداده للموردين</span>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-xs text-zinc-900">آخر فواتير البيع الصادرة</h3>
          <button
            type="button"
            onClick={() => onNavigateTab('sales')}
            className="text-[11px] text-zinc-500 hover:text-zinc-900 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>عرض الكل</span>
            <ArrowLeft className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">رقم الفاتورة</th>
                <th className="py-2.5 px-4">العميل</th>
                <th className="py-2.5 px-4">المحرك</th>
                <th className="py-2.5 px-4 text-left">الإجمالي</th>
                <th className="py-2.5 px-4 text-left">المسدد</th>
                <th className="py-2.5 px-4 text-left">المتبقي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sales.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-zinc-900">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-4 font-semibold text-zinc-900">{inv.customerName}</td>
                  <td className="py-2.5 px-4 text-zinc-700">{inv.engineTitle}</td>
                  <td className="py-2.5 px-4 text-left font-mono font-bold text-zinc-900">
                    {inv.finalAmount.toLocaleString('en-US')} ج.م
                  </td>
                  <td className="py-2.5 px-4 text-left font-mono font-medium text-emerald-700">
                    {inv.paidAmount.toLocaleString('en-US')} ج.م
                  </td>
                  <td className="py-2.5 px-4 text-left font-mono">
                    {inv.remainingAmount === 0 ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                        خالص
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700">
                        {inv.remainingAmount.toLocaleString('en-US')} ج.م
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-400 text-xs">
                    لا توجد فواتير بيع مسجلة بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
