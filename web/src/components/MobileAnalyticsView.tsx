import React from 'react';
import { Engine, SalesInvoice, Customer, Supplier, Transaction } from '../types';
import { TrendingUp, Package, Receipt, Users, Building2, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface MobileAnalyticsViewProps {
  engines: Engine[];
  invoices: SalesInvoice[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
}

export const MobileAnalyticsView: React.FC<MobileAnalyticsViewProps> = ({
  engines,
  invoices,
  customers,
  suppliers,
  transactions,
}) => {
  // Current available stock
  const availableEngines = engines.filter((e) => e.status === 'available');
  
  // Total inventory valuation calculated at wholesale purchase price (سعر الجملة)
  const inventoryWholesaleValue = availableEngines.reduce(
    (sum, e) => sum + (e.purchasePrice || 0),
    0
  );

  // Expected retail value of current stock
  const inventoryRetailValue = availableEngines.reduce(
    (sum, e) => sum + (e.salePrice || 0),
    0
  );

  // Current month entries (ما دخل المخزن هذا الشهر بسعر الجملة)
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const thisMonthEnteredEngines = engines.filter((e) => e.createdAt?.startsWith(currentMonthPrefix));
  const thisMonthEnteredValue = thisMonthEnteredEngines.reduce(
    (sum, e) => sum + (e.purchasePrice || 0),
    0
  );

  // Total Sales & Profits
  const totalSalesRevenue = invoices
    .filter((inv) => inv.status !== 'returned')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const totalCollectedCash = invoices
    .filter((inv) => inv.status !== 'returned')
    .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

  const totalCustomerDebt = customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.balanceDue || 0), 0);

  return (
    <div className="space-y-4 pb-24 text-xs">
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl">
        <span className="text-[11px] text-zinc-400 block mb-1">
          إجمالي قيمة المخزن الحالي (بسعر الجملة / التكلفة):
        </span>
        <span className="text-2xl font-bold font-mono text-amber-400 block">
          {inventoryWholesaleValue.toLocaleString()} ج.م
        </span>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 pt-2 border-t border-zinc-900">
          <span>عدد المواتير المتوفرة: <strong className="text-white font-mono">{availableEngines.length}</strong> محرك</span>
          <span>القيمة بسعر البيع: <strong className="text-emerald-400 font-mono">{inventoryRetailValue.toLocaleString()}</strong> ج.م</span>
        </div>
      </div>

      {/* Monthly Intake Breakdown */}
      <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-200">حركة التوريد لشهر ({currentMonthPrefix}):</span>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
            هذا الشهر
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
          <div className="bg-black border border-zinc-900 p-2.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-sans block">ما دخل المخزن بالجملة:</span>
            <span className="font-bold text-zinc-100 text-sm">{thisMonthEnteredValue.toLocaleString()} ج.م</span>
          </div>
          <div className="bg-black border border-zinc-900 p-2.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-sans block">عدد المواتير الواردة:</span>
            <span className="font-bold text-amber-400 text-sm">{thisMonthEnteredEngines.length} محرك</span>
          </div>
        </div>
      </div>

      {/* Debts Summary */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl">
          <span className="text-[10px] text-zinc-500 block mb-0.5">ديون لنا عند العملاء:</span>
          <span className="text-base font-bold font-mono text-emerald-400 block">
            {totalCustomerDebt.toLocaleString()} ج.م
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            مستحقات فواتير مؤجلة
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl">
          <span className="text-[10px] text-zinc-500 block mb-0.5">ديون علينا للموردين:</span>
          <span className="text-base font-bold font-mono text-rose-400 block">
            {totalSupplierDebt.toLocaleString()} ج.م
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            مستحقة بالسداد بالأجندة
          </span>
        </div>
      </div>

      {/* Revenue & Collections */}
      <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2">
        <h4 className="font-bold text-zinc-200">إجمالي المبيعات والتحصيل:</h4>
        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="bg-black border border-zinc-900 p-2.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-sans block">إجمالي الفواتير:</span>
            <span className="font-bold text-white text-sm">{totalSalesRevenue.toLocaleString()} ج.م</span>
          </div>
          <div className="bg-black border border-zinc-900 p-2.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-sans block">المحصل نقداً:</span>
            <span className="font-bold text-emerald-400 text-sm">{totalCollectedCash.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>
    </div>
  );
};
