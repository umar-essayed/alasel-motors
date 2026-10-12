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
  CheckCircle2,
  FileBadge,
  AlertTriangle,
  Clock,
  FileWarning,
  X,
  Phone,
} from 'lucide-react';
import { SaleInvoiceModal } from './SaleInvoiceModal';
import { ClearanceDocModal } from '../engines/ClearanceDocModal';
import { CreateSaleModal } from './CreateSaleModal';
import { ClearanceHandoverModal } from './ClearanceHandoverModal';

interface SalesListProps {
  settings: ShopSettings;
}

type PaperDeliveryFilter = 'all' | 'delayed_paper' | 'pending_paper' | 'delivered_paper' | 'returned';

export const SalesList: React.FC<SalesListProps> = ({ settings }) => {
  const [search, setSearch] = useState('');
  const [paperFilter, setPaperFilter] = useState<PaperDeliveryFilter>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<ClearanceDoc | null>(null);

  // Clearance handover modal state
  const [handoverInvoice, setHandoverInvoice] = useState<SalesInvoice | null>(null);

  // Return modal state
  const [invoiceToReturn, setInvoiceToReturn] = useState<SalesInvoice | null>(null);
  const [returnReason, setReturnReason] = useState('عيب تجربة أثناء فترة الضمان');
  const [isReturning, setIsReturning] = useState(false);

  // Post-sale discount modal state
  const [invoiceToDiscount, setInvoiceToDiscount] = useState<SalesInvoice | null>(null);
  const [extraDiscount, setExtraDiscount] = useState<number>(0);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);

  const sales = useLiveQuery(() => db.salesInvoices.reverse().sortBy('createdAt')) || [];

  // Helper to calculate days elapsed since invoice creation / sale date
  const getDaysElapsed = (dateStr?: string, createdAtStr?: string): number => {
    const raw = dateStr || createdAtStr;
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    if (isNaN(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
  };

  const activeSales = sales.filter((s) => s.status !== 'returned');
  const returnedSales = sales.filter((s) => s.status === 'returned');

  // Invoices where more than 30 days (1 month) passed without paper handover
  const delayedPaperSales = activeSales.filter(
    (s) => !s.clearanceDelivered && getDaysElapsed(s.date, s.createdAt) >= 30
  );

  // Pending papers (< 30 days)
  const pendingPaperSales = activeSales.filter(
    (s) => !s.clearanceDelivered && getDaysElapsed(s.date, s.createdAt) < 30
  );

  // Delivered papers
  const deliveredPaperSales = activeSales.filter((s) => s.clearanceDelivered);

  // Filtered sales matching active filter and search query
  const filteredSales = sales.filter((s) => {
    // 1. Status & Paper Delivery Filter
    if (paperFilter === 'delayed_paper') {
      if (s.status === 'returned' || s.clearanceDelivered || getDaysElapsed(s.date, s.createdAt) < 30) {
        return false;
      }
    } else if (paperFilter === 'pending_paper') {
      if (s.status === 'returned' || s.clearanceDelivered || getDaysElapsed(s.date, s.createdAt) >= 30) {
        return false;
      }
    } else if (paperFilter === 'delivered_paper') {
      if (s.status === 'returned' || !s.clearanceDelivered) {
        return false;
      }
    } else if (paperFilter === 'returned') {
      if (s.status !== 'returned') {
        return false;
      }
    }

    // 2. Search query filter
    const q = search.toLowerCase().trim();
    return (
      !q ||
      s.invoiceNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.engineNumber.toLowerCase().includes(q) ||
      s.engineTitle.toLowerCase().includes(q) ||
      (s.customerPhone && s.customerPhone.toLowerCase().includes(q))
    );
  });

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

      // 4. Record refund treasury transaction
      if (invoiceToReturn.paidAmount > 0) {
        await db.transactions.add({
          id: `refund-${invoiceToReturn.id}-${Date.now()}`,
          type: 'expense',
          category: 'refund',
          categoryLabel: 'مرتجع مبيعات',
          amount: invoiceToReturn.paidAmount,
          title: `استرداد فاتورة ${invoiceToReturn.invoiceNumber}`,
          notes: `استرداد نقدي لمرتجع فاتورة ${invoiceToReturn.invoiceNumber} - محرك ${invoiceToReturn.engineNumber}`,
          date: todayDate,
          relatedId: invoiceToReturn.id,
          createdBy: 'الكاشير',
          createdAt: now,
        });
      }

      setInvoiceToReturn(null);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء معالجة المرتجع');
    } finally {
      setIsReturning(false);
    }
  };

  const handleApplyExtraDiscount = async () => {
    if (!invoiceToDiscount || extraDiscount <= 0) return;
    setIsSavingDiscount(true);

    try {
      const oldFinal = invoiceToDiscount.finalAmount;
      const newDiscount = invoiceToDiscount.discount + extraDiscount;
      const newFinal = Math.max(0, invoiceToDiscount.totalAmount - newDiscount);
      const newProfit = Math.max(0, invoiceToDiscount.profit - extraDiscount);

      let newRemaining = 0;
      let newPaid = invoiceToDiscount.paidAmount;

      if (invoiceToDiscount.paymentType === 'cash') {
        newPaid = newFinal;
        newRemaining = 0;
      } else {
        newRemaining = Math.max(0, newFinal - newPaid);
      }

      await db.salesInvoices.update(invoiceToDiscount.id, {
        discount: newDiscount,
        finalAmount: newFinal,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        profit: newProfit,
        notes: invoiceToDiscount.notes
          ? `${invoiceToDiscount.notes} | تم تطبيق خصم إضافي بعد البيع: ${extraDiscount} ج.م`
          : `تم تطبيق خصم إضافي بعد البيع: ${extraDiscount} ج.م`,
      });

      // Update customer balance if credit sale
      if (
        invoiceToDiscount.customerId &&
        invoiceToDiscount.customerId !== 'cash-customer' &&
        invoiceToDiscount.paymentType !== 'cash'
      ) {
        const cust = await db.customers.get(invoiceToDiscount.customerId);
        if (cust) {
          const discountDiff = oldFinal - newFinal;
          await db.customers.update(cust.id, {
            totalPurchases: Math.max(0, cust.totalPurchases - discountDiff),
            balance: Math.max(0, cust.balance - discountDiff),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      setInvoiceToDiscount(null);
      setExtraDiscount(0);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تطبيق الخصم الإضافي');
    } finally {
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
      'حالة ورق الإفراج',
      'أيام منذ البيع',
      'مستلم الورق',
      'تاريخ تسليم الورق',
    ];

    const rows = filteredSales.map((s) => {
      const days = getDaysElapsed(s.date, s.createdAt);
      let paperStatus = 'بالمحل لم يُسلَّم';
      if (s.clearanceDelivered) {
        paperStatus = 'تم التسليم';
      } else if (s.status !== 'returned' && days >= 30) {
        paperStatus = `متأخر (+30 يوم) - ${days} يوم`;
      }

      return [
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
        paperStatus,
        days,
        s.clearanceRecipientName || '',
        s.clearanceDeliveryDate || '',
      ];
    });

    exportToCsv('فواتير_مبيعات_الوكالة', headers, rows);
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">فواتير المبيعات</h2>
            <span className="text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md font-semibold">
              {activeSales.length} سارية
            </span>
            {delayedPaperSales.length > 0 && (
              <span className="text-[11px] bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
                <span>{delayedPaperSales.length} متأخر استلام الورق</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            سجل فواتير البيع والتحصيل والمرتجعات ومتابعة تسليم أوراق الإفراج الجمركي
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير إكسيل</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* Prominent Overdue Paper Handover Alert Banner */}
      {delayedPaperSales.length > 0 && (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 dark:from-rose-950/30 dark:via-amber-950/20 dark:to-rose-950/30 border-2 border-rose-500/30 dark:border-rose-500/25 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-rose-500/20 dark:bg-rose-500/30 text-rose-700 dark:text-rose-400 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-rose-950 dark:text-rose-200">
                  تنبيه: عملاء مضى أكثر من شهر (30+ يوماً) ولم يستلموا أوراق الإفراج!
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs">
                  {delayedPaperSales.length} فواتير متأخرة
                </span>
              </div>
              <p className="text-xs text-rose-900/80 dark:text-rose-300/80 mt-1 leading-relaxed">
                يوجد <strong>{delayedPaperSales.length} عميل</strong> تم بيع المحركات لهم منذ أكثر من شهر والورق لا يزال مسجلاً بالمحل. يرجى التواصل معهم أو تسجيل تسليم الورق للمشتري.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => setPaperFilter(paperFilter === 'delayed_paper' ? 'all' : 'delayed_paper')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                paperFilter === 'delayed_paper'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {paperFilter === 'delayed_paper' ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>إلغاء الفلترة وعرض كافة الفواتير</span>
                </>
              ) : (
                <>
                  <FileWarning className="w-3.5 h-3.5" />
                  <span>عرض المتأخرين فقط ({delayedPaperSales.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">إجمالي المبيعات</span>
          <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
            {totalSalesRevenue.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">المحصل نقداً</span>
          <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
            {totalPaidCash.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">الآجل المتبقي</span>
          <span className="font-mono text-base font-bold text-amber-700 dark:text-amber-400 block mt-0.5">
            {totalRemainingCredit.toLocaleString('en-US')} ج.م
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">صافي الأرباح</span>
          <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
            +{totalProfits.toLocaleString('en-US')} ج.م
          </span>
        </div>
      </div>

      {/* Search & Paper Status Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، اسم العميل، الهاتف، رقم المحرك..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:border-zinc-800 dark:focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          <button
            type="button"
            onClick={() => setPaperFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${
              paperFilter === 'all'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            كافة الفواتير ({sales.length})
          </button>

          <button
            type="button"
            onClick={() => setPaperFilter('delayed_paper')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              paperFilter === 'delayed_paper'
                ? 'bg-rose-600 text-white shadow-xs'
                : delayedPaperSales.length > 0
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${delayedPaperSales.length > 0 ? 'text-rose-600 animate-pulse' : ''}`} />
            <span>متأخر الورق (+شهر)</span>
            <span className="bg-rose-500/20 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
              {delayedPaperSales.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPaperFilter('pending_paper')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              paperFilter === 'pending_paper'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>الورق بالمحل ({pendingPaperSales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPaperFilter('delivered_paper')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              paperFilter === 'delivered_paper'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>تم تسليم الورق ({deliveredPaperSales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPaperFilter('returned')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              paperFilter === 'returned'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>المرتجعات ({returnedSales.length})</span>
          </button>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
              <tr>
                <th className="py-3 px-4">الفاتورة وتسليم الورق</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">المحرك</th>
                <th className="py-3 px-4 text-left">الإجمالي</th>
                <th className="py-3 px-4 text-left">المسدد</th>
                <th className="py-3 px-4 text-left">المتبقي</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredSales.map((inv) => {
                const isReturned = inv.status === 'returned';
                const daysElapsed = getDaysElapsed(inv.date, inv.createdAt);
                const isDelayed = !isReturned && !inv.clearanceDelivered && daysElapsed >= 30;

                return (
                  <tr
                    key={inv.id}
                    className={`transition-colors ${
                      isDelayed
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-r-4 border-r-rose-500 hover:bg-rose-100/60 dark:hover:bg-rose-950/30'
                        : isReturned
                        ? 'bg-zinc-50/50 dark:bg-zinc-950/40 opacity-70 hover:bg-zinc-100/50'
                        : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <span>{inv.invoiceNumber}</span>
                        {isDelayed && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-1 py-0.2 rounded font-sans uppercase">
                            متأخر
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans block mt-0.5">
                        {inv.date} (منذ {daysElapsed} يوم)
                      </span>

                      {/* Paper Delivery Status & Action */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {inv.clearanceDelivered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded font-sans">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>سُلِّم الورق ({inv.clearanceRecipientName || 'المشتري'})</span>
                          </span>
                        ) : isDelayed ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded font-sans font-bold shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
                              <span>لم يستلم الورق ({daysElapsed} يوماً)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setHandoverInvoice(inv)}
                              className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors cursor-pointer shadow-2xs"
                              title="تسجيل تسليم أوراق الإفراج للمشتري"
                            >
                              تسليم الورق الآن
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-sans">
                            <Clock className="w-2.5 h-2.5" />
                            <span>الورق بالمحل لم يُسلَّم</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">{inv.customerName}</span>
                      {inv.customerPhone ? (
                        <a
                          href={`tel:${inv.customerPhone}`}
                          className="text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-mono inline-flex items-center gap-1 transition-colors mt-0.5"
                          title="اتصال بالعميل للتذكير بأوراق الإفراج"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{inv.customerPhone}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-mono">بدون هاتف</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 block">{inv.engineTitle}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                          {inv.engineNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEngineDoc(inv.engineNumber)}
                          className="text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-0.5 cursor-pointer"
                        >
                          <FileCheck2 className="w-3 h-3 text-zinc-400" />
                          <span>إفراج</span>
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-left font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {inv.finalAmount.toLocaleString('en-US')} ج.م
                    </td>

                    <td className="py-3 px-4 text-left font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {inv.paidAmount.toLocaleString('en-US')} ج.م
                    </td>

                    <td className="py-3 px-4 text-left font-mono">
                      {inv.remainingAmount === 0 ? (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-medium">
                          خالص
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {inv.remainingAmount.toLocaleString('en-US')} ج.م
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isReturned ? (
                        <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded">
                          مرتجع
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                          سارية
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                          title="طباعة الفاتورة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {!isReturned && (
                          <>
                            <button
                              type="button"
                              onClick={() => setHandoverInvoice(inv)}
                              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                inv.clearanceDelivered
                                  ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  : isDelayed
                                  ? 'text-rose-600 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/60 hover:bg-rose-200'
                                  : 'text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                              }`}
                              title={
                                inv.clearanceDelivered
                                  ? 'تعديل بيانات تسليم الورق'
                                  : isDelayed
                                  ? 'تسليم الورق للمشتري (متأخر +30 يوماً)'
                                  : 'تسليم أوراق الإفراج الجمركي للمشتري'
                              }
                            >
                              <FileBadge className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setInvoiceToDiscount(inv);
                                setExtraDiscount(0);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg cursor-pointer transition-colors"
                              title="إضافة خصم على الفاتورة"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setInvoiceToReturn(inv)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
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
                  <td colSpan={8} className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    {paperFilter === 'delayed_paper'
                      ? 'ممتاز! لا يوجد أي عملاء متأخرين في استلام الورق (+30 يوماً)'
                      : 'لا توجد فواتير مطابقة لمعايير البحث الحالية'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post-Sale Extra Discount Modal */}
      {invoiceToDiscount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
              <Tag className="w-4 h-4" />
              <span>إضافة خصم للفاتورة ({invoiceToDiscount.invoiceNumber})</span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>المحرك:</span>
                <span className="font-sans font-bold text-zinc-900 dark:text-zinc-100">{invoiceToDiscount.engineTitle}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>الصافي الحالي:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{invoiceToDiscount.finalAmount.toLocaleString('en-US')} ج.م</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>الخصم السابق:</span>
                <span>{invoiceToDiscount.discount.toLocaleString('en-US')} ج.م</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                مبلغ الخصم الإضافي (ج.م)
              </label>
              <input
                type="number"
                min="0"
                max={invoiceToDiscount.finalAmount}
                value={extraDiscount}
                onChange={(e) => setExtraDiscount(Number(e.target.value))}
                placeholder="أدخل قيمة الخصم..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
                سيصبح الصافي: {(invoiceToDiscount.finalAmount - (extraDiscount || 0)).toLocaleString('en-US')} ج.م
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setInvoiceToDiscount(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleApplyExtraDiscount}
                disabled={isSavingDiscount || extraDiscount <= 0}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 cursor-pointer"
              >
                {isSavingDiscount ? 'جارٍ الحفظ...' : 'تطبيق الخصم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Invoice Confirmation Modal */}
      {invoiceToReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>إرجاع محرك واسترداد الفاتورة</span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              سيتم إعادة المحرك <strong>({invoiceToReturn.engineNumber})</strong> للمخزن،
              وتسجيل خروج نقدية بقيمة <strong>({invoiceToReturn.paidAmount.toLocaleString('en-US')} ج.م)</strong> من الخزينة،
              وإلغاء المديونية من حساب العميل.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">سبب الإرجاع</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setInvoiceToReturn(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleReturnInvoice}
                disabled={isReturning}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer"
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

      <ClearanceHandoverModal
        invoice={handoverInvoice}
        isOpen={Boolean(handoverInvoice)}
        onClose={() => setHandoverInvoice(null)}
        onSaved={() => {}}
      />

      <CreateSaleModal
        isOpen={isCreateOpen}
        settings={settings}
        onClose={() => setIsCreateOpen(false)}
        onSaleCreated={(newInv) => setSelectedInvoice(newInv)}
      />
    </div>
  );
};
