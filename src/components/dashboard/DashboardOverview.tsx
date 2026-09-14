import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TabType } from '../layout/Sidebar';
import { Engine, SalesInvoice } from '../../types';
import {
  Cpu,
  Receipt,
  Users,
  WalletCards,
  TrendingUp,
  PlusCircle,
  ShoppingCart,
  HandCoins,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenNewEngineModal: () => void;
  onOpenSaleModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onOpenNewEngineModal,
  onOpenSaleModal,
}) => {
  const engines = useLiveQuery(() => db.engines.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];
  const sales = useLiveQuery(() => db.salesInvoices.reverse().sortBy('createdAt')) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const availableEngines = engines.filter((e) => e.status === 'available');
  const missingClearanceEngines = availableEngines.filter((e) => !e.hasClearanceDoc);

  const totalWholesaleValue = availableEngines.reduce(
    (sum, e) => sum + e.costPrice + e.additionalCost,
    0
  );
  const totalRetailValue = availableEngines.reduce(
    (sum, e) => sum + e.sellingPrice,
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
  const currentCashInDrawer = totalIncome - totalExpense;

  const totalProfits = sales.reduce((sum, s) => sum + s.profit, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold mb-3 border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام إدارة مواتير الأصيل • جاهز للاستخدام اليومي</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            مرحباً بك في لوحة تحكم الأصيل موتورز
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            متابعة شاملة للمخزن، أرقام المحركات، فواتير الشراء والبيع، أوراق التخليص الجمركي المعتمدة، وحركة الخزينة اللحظية.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              type="button"
              onClick={onOpenNewEngineModal}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة مكنة جديدة للمخزن</span>
            </button>
            <button
              type="button"
              onClick={onOpenSaleModal}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <span>إصدار فاتورة بيع مكنة</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Engines in Stock */}
        <div
          onClick={() => onNavigateTab('engines')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">المكن المتاح بالمخزن</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {availableEngines.length} مكنة
          </div>
          <div className="text-xs text-slate-500 mt-1 flex justify-between">
            <span>قيمة الجملة:</span>
            <strong className="text-slate-800">{totalWholesaleValue.toLocaleString('ar-EG')} ج.م</strong>
          </div>
        </div>

        {/* Card 2: Cashbox Balance */}
        <div
          onClick={() => onNavigateTab('treasury')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">رصيد الخزينة (الدرج)</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition-transform">
              <WalletCards className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {currentCashInDrawer.toLocaleString('ar-EG')} ج.م
          </div>
          <div className="text-xs text-emerald-700 mt-1 flex justify-between font-semibold">
            <span>صافي أرباح المبيعات:</span>
            <span>+{totalProfits.toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>

        {/* Card 3: Receivables from Customers */}
        <div
          onClick={() => onNavigateTab('customers')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">الآجل بالخارج (فلوس العملاء)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-950 font-mono">
            {totalCustomerDebt.toLocaleString('ar-EG')} ج.م
          </div>
          <div className="text-xs text-slate-500 mt-1">
            على {customers.filter((c) => c.balance > 0).length} عملاء
          </div>
        </div>

        {/* Card 4: Supplier Dues */}
        <div
          onClick={() => onNavigateTab('suppliers')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">مستحقات الموردين (علينا)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-900 font-mono">
            {totalSupplierDebt.toLocaleString('ar-EG')} ج.م
          </div>
          <div className="text-xs text-slate-500 mt-1">
            لـ {suppliers.filter((s) => s.balance > 0).length} مكاتب استيراد
          </div>
        </div>
      </div>

      {/* Alert Strip if any engine is missing customs doc */}
      {missingClearanceEngines.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-amber-950 text-sm block">
                تنبيه أوراق الإفراج الجمركي: يوجد {missingClearanceEngines.length} مكنة بالمخزن لم يتم رفع صورة إفراجها الجمركي بعد!
              </strong>
              <span className="text-amber-800">
                يُفضل تصوير ورفع أوراق الإفراج الجمركي لكل مكنة فور استلامها لتسليمها للعميل عند الترخيص بالمرور.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('engines')}
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer shrink-0"
          >
            <span>استعراض المكن</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent Sales Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">
              آخر عمليات بيع المواتير
            </h3>
            <p className="text-xs text-slate-500">سجل الفواتير الصادرة مؤخراً من المحل</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('sales')}
            className="text-xs font-bold text-slate-800 hover:text-slate-950 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl cursor-pointer"
          >
            <span>عرض كل الفواتير</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">المكنة ورقم المحرك</th>
                <th className="py-3 px-4 text-left">قيمة البيع</th>
                <th className="py-3 px-4 text-left">المسدد نقداً</th>
                <th className="py-3 px-4 text-left">الآجل المتبقي</th>
                <th className="py-3 px-4 text-left">الربح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {sales.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 font-semibold">{inv.customerName}</td>
                  <td className="py-3 px-4">
                    <span>{inv.engineTitle}</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-1 rounded mr-1">
                      {inv.engineNumber}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-left font-mono font-bold">{inv.finalAmount.toLocaleString('ar-EG')} ج.م</td>
                  <td className="py-3 px-4 text-left font-mono font-bold text-emerald-700">{inv.paidAmount.toLocaleString('ar-EG')} ج.م</td>
                  <td className="py-3 px-4 text-left font-mono">
                    {inv.remainingAmount === 0 ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                        خالص
                      </span>
                    ) : (
                      <span className="text-amber-800 font-bold">
                        {inv.remainingAmount.toLocaleString('ar-EG')} ج.م
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-left font-mono font-bold text-purple-700">
                    +{inv.profit.toLocaleString('ar-EG')} ج.م
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا توجد فواتير مبيعات مسجلة بعد
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
