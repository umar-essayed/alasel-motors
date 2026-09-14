import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TrendingUp, BarChart3, PieChart, DollarSign, Cpu, ArrowUpRight } from 'lucide-react';

export const AnalyticsChartsView: React.FC = () => {
  const engines = useLiveQuery(() => db.engines.toArray()) || [];
  const sales = useLiveQuery(() => db.salesInvoices.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // Totals
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const totalCashCollected = sales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalCreditReceivable = customers.reduce((sum, c) => sum + c.balance, 0);

  // Brand Distribution in Stock
  const brandCounts: Record<string, number> = {};
  engines.forEach((e) => {
    const brand = e.carBrand.split('(')[0].trim() || 'أخرى';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });

  const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
  const maxBrandCount = Math.max(...Object.values(brandCounts), 1);

  // Profit by sale invoice
  const topProfitableSales = [...sales]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 4 Clean Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">إجمالي المبيعات</span>
          <span className="font-mono text-2xl font-bold text-slate-900 block">
            {totalSalesRevenue.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">من {sales.length} فاتورة</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">صافي أرباح المبيعات</span>
          <span className="font-mono text-2xl font-bold text-emerald-600 block">
            +{totalProfit.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            هامش ربح {totalSalesRevenue > 0 ? Math.round((totalProfit / totalSalesRevenue) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">السيولة النقدية المحصلة</span>
          <span className="font-mono text-2xl font-bold text-blue-600 block">
            {totalCashCollected.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">كاش في الخزينة</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">الآجل والديون بالخارج</span>
          <span className="font-mono text-2xl font-bold text-amber-600 block">
            {totalCreditReceivable.toLocaleString('en-US')} ج.م
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">مستحقة لدى العملاء</span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Inventory Stock Breakdown by Car Brand */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">توزيع المخزن حسب الماركة</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">{engines.length} مكنة</span>
          </div>

          <div className="space-y-3 pt-2">
            {sortedBrands.map(([brand, count]) => {
              const percentage = Math.round((count / engines.length) * 100) || 0;
              const barWidth = Math.round((count / maxBrandCount) * 100);

              return (
                <div key={brand} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{brand}</span>
                    <span className="font-mono text-slate-500">{count} مكنة ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Top Profitable Engines */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">أعلى المبيعات من حيث صافي الربح</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">أعلى 5 مبيعات</span>
          </div>

          <div className="divide-y divide-slate-100">
            {topProfitableSales.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">{inv.engineTitle}</span>
                  <span className="font-mono text-[11px] text-slate-400">{inv.engineNumber} • عميل: {inv.customerName}</span>
                </div>
                <div className="text-left">
                  <span className="font-mono text-sm font-bold text-emerald-600 block">
                    +{inv.profit.toLocaleString('en-US')} ج.م
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    بيع: {inv.finalAmount.toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>
            ))}

            {topProfitableSales.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                لا توجد مبيعات مسجلة حتى الآن
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
