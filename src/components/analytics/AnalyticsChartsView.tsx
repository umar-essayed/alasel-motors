import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import {
  TrendingUp,
  PieChart,
  Warehouse,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Calendar,
  Layers,
} from 'lucide-react';

export const AnalyticsChartsView: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const engines = useLiveQuery(() => db.engines.toArray()) || [];
  const sales = useLiveQuery(() => db.salesInvoices.filter((s) => s.status !== 'returned').toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // Current Stock Valuation (Strictly at Wholesale / Cost Price + Additional Cost)
  const availableEngines = engines.filter((e) => e.status === 'available');
  const currentInventoryCostValue = availableEngines.reduce(
    (sum, e) => sum + (e.costPrice || 0) + (e.additionalCost || 0),
    0
  );
  const currentInventoryExpectedSalesValue = availableEngines.reduce(
    (sum, e) => sum + (e.sellingPrice || 0),
    0
  );
  const expectedUnrealizedProfit = currentInventoryExpectedSalesValue - currentInventoryCostValue;

  // Monthly Intake & Entry (Calculated strictly at wholesale cost)
  const monthlyIntakeEngines = engines.filter((e) => {
    if (!e.createdAt) return false;
    return e.createdAt.startsWith(selectedMonth);
  });
  const monthlyIntakeCostValue = monthlyIntakeEngines.reduce(
    (sum, e) => sum + (e.costPrice || 0) + (e.additionalCost || 0),
    0
  );

  // Monthly Sales
  const monthlySales = sales.filter((s) => {
    if (!s.date && !s.createdAt) return false;
    const dateStr = s.date || s.createdAt;
    return dateStr.startsWith(selectedMonth);
  });
  const monthlySalesRevenue = monthlySales.reduce((sum, s) => sum + s.finalAmount, 0);
  const monthlySalesProfit = monthlySales.reduce((sum, s) => sum + s.profit, 0);
  const monthlySalesCost = monthlySales.reduce((sum, s) => sum + s.costPrice, 0);

  // Overall Totals
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const totalCashCollected = sales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalCreditReceivable = customers.reduce((sum, c) => sum + c.balance, 0);

  // Brand Distribution in Stock
  const brandCounts: Record<string, { count: number; cost: number }> = {};
  availableEngines.forEach((e) => {
    const brand = e.carBrand.split('(')[0].trim() || 'أخرى';
    if (!brandCounts[brand]) {
      brandCounts[brand] = { count: 0, cost: 0 };
    }
    brandCounts[brand].count += 1;
    brandCounts[brand].cost += (e.costPrice || 0) + (e.additionalCost || 0);
  });

  const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1].count - a[1].count);
  const maxBrandCount = Math.max(...Object.values(brandCounts).map((b) => b.count), 1);

  const topProfitableSales = [...sales]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Top Filter & Month Switcher */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-700" />
            <span>تحليلات المخزن والأرباح والسيولة</span>
          </h2>
          <span className="text-[11px] text-zinc-500">
            حسابات المخزون تعتمد رسمياً على سعر الجملة والتكلفة الفعلية
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-600 font-medium">الشهر المالي:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-bold text-zinc-800"
          />
        </div>
      </div>

      {/* Row 1: INVENTORY VALUATION (At Wholesale/Cost) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Warehouse Value (Wholesale) */}
        <div className="bg-zinc-900 text-white border border-zinc-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-blue-400" />
              <span>إجمالي قيمة المخزن (جملة)</span>
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
              بالتكلفة
            </span>
          </div>
          <span className="font-mono text-2xl font-bold text-white block mt-1">
            {currentInventoryCostValue.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {availableEngines.length} محرك متاح حالياً بالمستودع
          </span>
        </div>

        {/* Incoming Inventory This Month (At Cost) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-zinc-700">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>وارد المخزن هذا الشهر (جملة)</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">{selectedMonth}</span>
          </div>
          <span className="font-mono text-2xl font-bold text-zinc-900 block mt-1">
            {monthlyIntakeCostValue.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            دخول {monthlyIntakeEngines.length} محرك جديد للمخزن
          </span>
        </div>

        {/* Sales This Month */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-zinc-700">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
              <span>مبيعات هذا الشهر</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">{monthlySales.length} مباع</span>
          </div>
          <span className="font-mono text-2xl font-bold text-zinc-900 block mt-1">
            {monthlySalesRevenue.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            تكلفة البضاعة المباعة: {monthlySalesCost.toLocaleString('en-US')} ج.م
          </span>
        </div>

        {/* Profit This Month */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-zinc-700">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>صافي أرباح هذا الشهر</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              {monthlySalesRevenue > 0
                ? Math.round((monthlySalesProfit / monthlySalesRevenue) * 100)
                : 0}
              % هامش
            </span>
          </div>
          <span className="font-mono text-2xl font-bold text-emerald-700 block mt-1">
            +{monthlySalesProfit.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            أرباح محققة من مبيعات الشهر
          </span>
        </div>
      </div>

      {/* Row 2: FINANCIAL LIQUIDITY & DEBT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-zinc-500 block">إجمالي المبيعات الشامل</span>
          <span className="font-mono text-lg font-bold text-zinc-900 block mt-0.5">
            {totalSalesRevenue.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">{sales.length} فاتورة مسجلة</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-zinc-500 block">إجمالي أرباح المحركات المباعة</span>
          <span className="font-mono text-lg font-bold text-emerald-700 block mt-0.5">
            +{totalProfit.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">
            هامش كلي {totalSalesRevenue > 0 ? Math.round((totalProfit / totalSalesRevenue) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-zinc-500 block">إجمالي السيولة المحصلة</span>
          <span className="font-mono text-lg font-bold text-zinc-900 block mt-0.5">
            {totalCashCollected.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">نقداً داخل الخزينة</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-zinc-500 block">الديون والآجل المستحق</span>
          <span className="font-mono text-lg font-bold text-amber-700 block mt-0.5">
            {totalCreditReceivable.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 block">متبقي بذمة العملاء</span>
        </div>
      </div>

      {/* Row 3: Expected Realizable Value in Warehouse */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-zinc-600 shrink-0" />
          <div>
            <span className="font-bold text-zinc-800 block">
              القيمة البيعية المتوقعة للبضاعة في المخزن:
            </span>
            <span className="text-[11px] text-zinc-500">
              حساب إجمالي أسعار بيع المحركات المعروضة حالياً
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 font-mono">
          <div>
            <span className="text-zinc-500 text-[11px] block">سعر البيع المتوقع:</span>
            <span className="font-bold text-zinc-900">
              {currentInventoryExpectedSalesValue.toLocaleString('en-US')} ج.م
            </span>
          </div>
          <div>
            <span className="text-zinc-500 text-[11px] block">الأرباح المتوقعة عند البيع:</span>
            <span className="font-bold text-emerald-700">
              +{expectedUnrealizedProfit.toLocaleString('en-US')} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Row 4: Visual Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Stock Breakdown by Car Brand with Wholesale Cost */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-zinc-700" />
              <h3 className="font-bold text-zinc-900 text-xs">
                توزيع المخزن حسب الماركة ورأس المال
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {availableEngines.length} متاح
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {sortedBrands.map(([brand, data]) => {
              const percentage = Math.round((data.count / availableEngines.length) * 100) || 0;
              const barWidth = Math.round((data.count / maxBrandCount) * 100);

              return (
                <div key={brand} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-800">{brand}</span>
                    <div className="text-left font-mono text-[11px] text-zinc-500 flex items-center gap-3">
                      <span>{data.cost.toLocaleString('en-US')} ج.م جملة</span>
                      <span className="font-bold text-zinc-700">
                        {data.count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-zinc-900 h-full rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {sortedBrands.length === 0 && (
              <div className="py-6 text-center text-zinc-400 text-xs">
                المخزن فارغ حالياً
              </div>
            )}
          </div>
        </div>

        {/* Top Profitable Engines */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-zinc-900 text-xs">أعلى المبيعات من حيث صافي الربح</h3>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">أعلى 5</span>
          </div>

          <div className="divide-y divide-zinc-100">
            {topProfitableSales.map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-900 text-xs block">{inv.engineTitle}</span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {inv.engineNumber} • {inv.customerName}
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-mono text-xs font-bold text-emerald-700 block">
                    +{inv.profit.toLocaleString('en-US')} ج.م
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    بيع: {inv.finalAmount.toLocaleString('en-US')} • تكلفة: {inv.costPrice.toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            ))}

            {topProfitableSales.length === 0 && (
              <div className="py-6 text-center text-zinc-400 text-xs">
                لا توجد مبيعات مسجلة بعد
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
