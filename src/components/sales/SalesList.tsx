import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { SalesInvoice, ShopSettings, ClearanceDoc } from '../../types';
import { exportToCsv } from '../../utils/exportUtils';
import {
  Plus,
  Search,
  Printer,
  FileCheck2,
  Download,
  RotateCcw,
  AlertCircle,
  Tag,
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

  // Return modal state
  const [invoiceToReturn, setInvoiceToReturn] = useState<SalesInvoice | null>(null);
  const [returnReason, setReturnReason] = useState('عيب تجربة أثناء فترة الضمان');
  const [isReturning, setIsReturning] = useState(false);

  // Post-sale discount modal state
  const [invoiceToDiscount, setInvoiceToDiscount] = useState<SalesInvoice | null>(null);
  const [extraDiscount, setExtraDiscount] = useState<number>(0);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);

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

  const activeSales = sales.filter((s) => s.status !== 'returned');
  const totalSalesRevenue = activeSales.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalPaidCash = activeSales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalRemainingCredit = activeSales.reduce((sum, s) => sum + s.remainingAmount, 0);
  const totalProfits = activeSales.reduce((sum, s) => sum + s.profit, 0);

  const handleOpenEngineDoc = async (engineNumber: string) => {
    const doc = await db.clearanceDocs.where('engineNumber').equals(engineNumber).first();
    if (doc) setViewingDoc(doc);
    else alert(`لا يوجد ورق إفراج محفوظ للمحرك ${engineNumber}`);
  };

  const handleReturnInvoice = async () => {
    if (!invoiceToReturn) return;
    setIsReturning(true);

    try {
      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];

      // 1. Mark invoice as returned
      await db.salesInvoices.update(invoiceToReturn.id, {
        status: 'returned',
        returnDate: todayDate,
        returnReason: returnReason.trim(),
        refundAmount: invoiceToReturn.paidAmount,
      });

      // 2. Return engine to available inventory
      await db.engines.update(invoiceToReturn.engineId, {
        status: 'available',
        customerId: undefined,
        customerName: undefined,
        saleInvoiceId: undefined,
        saleDate: undefined,
        actualSoldPrice: undefined,
        updatedAt: now,
      });

      // 3. Reverse customer balance and purchases
      if (invoiceToReturn.customerId && invoiceToReturn.customerId !== 'cash-customer') {
        const cust = await db.customers.get(invoiceToReturn.customerId);
        if (cust) {
          await db.customers.update(cust.id, {
            totalPurchases: Math.max(0, cust.totalPurchases - invoiceToReturn.finalAmount),
            totalPaid: Math.max(0, cust.totalPaid - invoiceToReturn.paidAmount),
            balance: Math.max(0, cust.balance - invoiceToReturn.remainingAmount),
            updatedAt: now,
          });
        }
      }

      // 4. Record expense transaction in Treasury for refunded cash
      if (invoiceToReturn.paidAmount > 0) {
        await db.transactions.add({
          id: `tx-${Date.now()}`,
          type: 'expense',
          category: 'refund',
          categoryLabel: 'مرتجع مبيعات',
          amount: invoiceToReturn.paidAmount,
          title: `استرجاع محرك ${invoiceToReturn.engineNumber} (فاتورة ${invoiceToReturn.invoiceNumber})`,
          notes: returnReason.trim(),
          date: todayDate,
          relatedId: invoiceToReturn.id,
          createdBy: 'النظام',
          createdAt: now,
        });
      }

      setInvoiceToReturn(null);
      setIsReturning(false);
    } catch (err) {
      console.error('Failed to process return:', err);
      setIsReturning(false);
    }
  };

  const handleApplyExtraDiscount = async () => {
    if (!invoiceToDiscount || extraDiscount <= 0) return;
    setIsSavingDiscount(true);

    try {
      const now = new Date().toISOString();
      const newDiscount = invoiceToDiscount.discount + extraDiscount;
      const newFinalAmount = Math.max(0, invoiceToDiscount.totalAmount - newDiscount);
      const newRemainingAmount = Math.max(0, newFinalAmount - invoiceToDiscount.paidAmount);
      const newProfit = newFinalAmount - invoiceToDiscount.costPrice;

      // 1. Update invoice
      await db.salesInvoices.update(invoiceToDiscount.id, {
        discount: newDiscount,
        finalAmount: newFinalAmount,
        remainingAmount: newRemainingAmount,
        profit: newProfit,
      });

      // 2. Update engine actualSoldPrice
      await db.engines.update(invoiceToDiscount.engineId, {
        actualSoldPrice: newFinalAmount,
        updatedAt: now,
      });

      // 3. If customer has balance / purchases, adjust customer debt
      if (invoiceToDiscount.customerId && invoiceToDiscount.customerId !== 'cash-customer') {
        const cust = await db.customers.get(invoiceToDiscount.customerId);
        if (cust) {
          const discountDiff = invoiceToDiscount.remainingAmount - newRemainingAmount;
          await db.customers.update(cust.id, {
            totalPurchases: Math.max(0, cust.totalPurchases - extraDiscount),
            balance: Math.max(0, cust.balance - discountDiff),
            updatedAt: now,
          });
        }
      }

      setInvoiceToDiscount(null);
      setExtraDiscount(0);
      setIsSavingDiscount(false);
    } catch (err) {
      console.error('Failed to update discount:', err);
      setIsSavingDiscount(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'رقم الفاتورة',
      'التاريخ',
      'العميل',
      'الهاتف',
      'المحرك',
      'رقم المحرك',
      'الإجمالي',
      'المسدد',
      'المتبقي',
      'الربح',
      'الحالة',
    ];

    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      s.date,
      s.customerName,
      s.customerPhone,
      s.engineTitle,
      s.engineNumber,
      s.finalAmount,
      s.paidAmount,
      s.remainingAmount,
      s.profit,
      s.status === 'returned' ? 'مرتجع' : 'سارية',
    ]);

    exportToCsv('فواتير_مبيعات_الأصيل', headers, rows);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-900">فواتير المبيعات</h2>
            <span className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-semibold">
              {activeSales.length} سارية
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">سجل فواتير البيع والتحصيل والمرتجعات</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-zinc-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير إكسيل</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-zinc-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 block">إجمالي المبيعات</span>
          <span className="font-mono text-base font-bold text-zinc-900 block mt-0.5">
            {totalSalesRevenue.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 block">المحصل نقداً</span>
          <span className="font-mono text-base font-bold text-zinc-900 block mt-0.5">
            {totalPaidCash.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 block">الآجل المتبقي</span>
          <span className="font-mono text-base font-bold text-amber-700 block mt-0.5">
            {totalRemainingCredit.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 block">صافي الأرباح</span>
          <span className="font-mono text-base font-bold text-emerald-700 block mt-0.5">
            +{totalProfits.toLocaleString('en-US')} ج.م
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-zinc-200 rounded-xl p-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، العميل، رقم المحرك..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
          />
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">الفاتورة</th>
                <th className="py-2.5 px-4">العميل</th>
                <th className="py-2.5 px-4">المحرك</th>
                <th className="py-2.5 px-4 text-left">الإجمالي</th>
                <th className="py-2.5 px-4 text-left">المسدد</th>
                <th className="py-2.5 px-4 text-left">المتبقي</th>
                <th className="py-2.5 px-4 text-center">الحالة</th>
                <th className="py-2.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredSales.map((inv) => {
                const isReturned = inv.status === 'returned';

                return (
                  <tr key={inv.id} className={`hover:bg-zinc-50/80 transition-colors ${isReturned ? 'bg-zinc-50/50 opacity-70' : ''}`}>
                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-900">
                      <div>{inv.invoiceNumber}</div>
                      <span className="text-[10px] text-zinc-400 font-sans">{inv.date}</span>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-zinc-900 block">{inv.customerName}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{inv.customerPhone}</span>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="font-medium text-zinc-800">{inv.engineTitle}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-zinc-600 bg-zinc-100 px-1 py-0.5 rounded">
                          {inv.engineNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEngineDoc(inv.engineNumber)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 cursor-pointer"
                        >
                          <FileCheck2 className="w-3 h-3 text-zinc-400" />
                          <span>إفراج</span>
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-left font-mono font-bold text-zinc-900">
                      {inv.finalAmount.toLocaleString('en-US')} ج.م
                    </td>

                    <td className="py-2.5 px-4 text-left font-mono font-semibold text-zinc-900">
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

                    <td className="py-2.5 px-4 text-center">
                      {isReturned ? (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          مرتجع
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          سارية
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded cursor-pointer"
                          title="طباعة الفاتورة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {!isReturned && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setInvoiceToDiscount(inv);
                                setExtraDiscount(0);
                              }}
                              className="p-1 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer"
                              title="إضافة خصم على الفاتورة"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setInvoiceToReturn(inv)}
                              className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              title="إرجاع محرك (مرتجع)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400 text-xs">
                    لا توجد فواتير مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post-Sale Extra Discount Modal */}
      {invoiceToDiscount && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              <Tag className="w-4 h-4" />
              <span>إضافة خصم للفاتورة ({invoiceToDiscount.invoiceNumber})</span>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-zinc-600">
                <span>المحرك:</span>
                <span className="font-sans font-bold text-zinc-900">{invoiceToDiscount.engineTitle}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>الصافي الحالي:</span>
                <span className="font-bold text-zinc-900">{invoiceToDiscount.finalAmount.toLocaleString('en-US')} ج.م</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>الخصم السابق:</span>
                <span>{invoiceToDiscount.discount.toLocaleString('en-US')} ج.م</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">مبلغ الخصم الإضافي (ج.م)</label>
              <input
                type="number"
                min="0"
                max={invoiceToDiscount.finalAmount}
                value={extraDiscount}
                onChange={(e) => setExtraDiscount(Number(e.target.value))}
                placeholder="أدخل قيمة الخصم..."
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm font-mono font-bold text-zinc-900"
              />
              <span className="text-[11px] text-zinc-400 mt-1 block">
                سيصبح الصافي: {(invoiceToDiscount.finalAmount - (extraDiscount || 0)).toLocaleString('en-US')} ج.م
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setInvoiceToDiscount(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleApplyExtraDiscount}
                disabled={isSavingDiscount || extraDiscount <= 0}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                {isSavingDiscount ? 'جارٍ الحفظ...' : 'تطبيق الخصم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Invoice Confirmation Modal */}
      {invoiceToReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>إرجاع محرك واسترداد الفاتورة</span>
            </div>

            <p className="text-xs text-zinc-600">
              سيتم إعادة المحرك <strong>({invoiceToReturn.engineNumber})</strong> للمخزن،
              وتسجيل خروج نقدية بقيمة <strong>({invoiceToReturn.paidAmount.toLocaleString('en-US')} ج.م)</strong> من الخزينة،
              وإلغاء المديونية من حساب العميل.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">سبب الإرجاع</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setInvoiceToReturn(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleReturnInvoice}
                disabled={isReturning}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >
                {isReturning ? 'جارٍ الإرجاع...' : 'تأكيد المرتجع'}
              </button>
            </div>
          </div>
        </div>
      )}

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
