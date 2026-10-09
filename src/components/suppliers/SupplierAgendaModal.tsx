import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Supplier, ShopSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../utils/exportUtils';
import {
  Printer,
  X,
  BookOpen,
  PlusCircle,
  Download,
  Trash2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface SupplierAgendaModalProps {
  supplier: Supplier | null;
  settings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
}

interface UnifiedAgendaRow {
  id: string;
  source: 'ledger' | 'payment' | 'engine';
  rawId: string;
  date: string;
  type: 'debt' | 'payment' | 'discount';
  label: string;
  description: string;
  credit: number; // له (دين علينا)
  debit: number;  // منه (سداد أو تسوية)
  runningBalance?: number;
  paymentMethod?: string;
  createdBy?: string;
  canDelete: boolean;
  createdAt: string;
}

export const SupplierAgendaModal: React.FC<SupplierAgendaModalProps> = ({
  supplier,
  settings,
  isOpen,
  onClose,
}) => {
  const { currentAccount } = useAuth();

  // Form state
  const [entryType, setEntryType] = useState<'debt' | 'payment' | 'discount'>('debt');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'wallet'>('cash');
  const [affectTreasury, setAffectTreasury] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Filtering
  const [filterType, setFilterType] = useState<'all' | 'debt' | 'payment' | 'discount'>('all');

  // Live queries for this supplier
  const ledgerEntries = useLiveQuery(
    () => (supplier ? db.supplierLedger.where('supplierId').equals(supplier.id).toArray() : []),
    [supplier?.id]
  ) || [];

  const legacyPayments = useLiveQuery(
    () => (supplier ? db.payments.where('partyId').equals(supplier.id).toArray() : []),
    [supplier?.id]
  ) || [];

  const creditEngines = useLiveQuery(
    () => (supplier ? db.engines.where('supplierId').equals(supplier.id).toArray() : []),
    [supplier?.id]
  ) || [];

  // Merge everything into a unified chronological ledger
  const unifiedRows = useMemo(() => {
    if (!supplier) return [];

    const rows: UnifiedAgendaRow[] = [];

    // 1. Manual agenda entries
    for (const entry of ledgerEntries) {
      const isDebt = entry.type === 'debt';
      const isPayment = entry.type === 'payment';
      rows.push({
        id: `ledger-${entry.id}`,
        source: 'ledger',
        rawId: entry.id,
        date: entry.date,
        type: entry.type,
        label: isDebt ? 'دين مسجل بالأجندة' : isPayment ? 'دفعة مسددة' : 'خصم / تسوية',
        description: entry.notes || (isDebt ? 'دين إضافي' : 'دفعة سداد'),
        credit: isDebt ? entry.amount : 0,
        debit: !isDebt ? entry.amount : 0,
        paymentMethod: entry.paymentMethod,
        createdBy: entry.createdBy,
        canDelete: true,
        createdAt: entry.createdAt,
      });
    }

    // 2. Engines purchased on credit
    for (const eng of creditEngines) {
      if (eng.purchaseOnCredit && eng.costPrice > 0) {
        rows.push({
          id: `eng-${eng.id}`,
          source: 'engine',
          rawId: eng.id,
          date: eng.createdAt.split('T')[0],
          type: 'debt',
          label: 'شراء محرك بالأجل',
          description: `محرك رقم: ${eng.engineNumber} (${eng.carBrand} ${eng.carModel})`,
          credit: eng.costPrice,
          debit: 0,
          canDelete: false,
          createdAt: eng.createdAt,
        });
      }
    }

    // 3. Payments from payment receipts that aren't already represented in ledger
    for (const pay of legacyPayments) {
      const alreadyInLedger = ledgerEntries.some(
        (l) => l.type === 'payment' && l.date === pay.date && Math.abs(l.amount - pay.amount) < 0.01
      );
      if (!alreadyInLedger) {
        rows.push({
          id: `pay-${pay.id}`,
          source: 'payment',
          rawId: pay.id,
          date: pay.date,
          type: 'payment',
          label: 'سند صرف نقدية',
          description: pay.notes || `سند رقم: ${pay.receiptNumber}`,
          credit: 0,
          debit: pay.amount,
          paymentMethod: pay.paymentMethod,
          createdBy: pay.createdBy,
          canDelete: false,
          createdAt: pay.createdAt,
        });
      }
    }

    // Sort ascending by date & createdAt to compute running balance correctly
    rows.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.createdAt.localeCompare(b.createdAt);
    });

    let running = 0;
    for (const row of rows) {
      running += (row.credit - row.debit);
      row.runningBalance = Math.max(0, running);
    }

    // Reverse for displaying newest on top
    return [...rows].reverse();
  }, [supplier, ledgerEntries, legacyPayments, creditEngines]);

  if (!isOpen || !supplier) return null;

  const filteredRows = unifiedRows.filter((r) => {
    if (filterType === 'all') return true;
    return r.type === filterType;
  });

  const totalDebts = unifiedRows.reduce((sum, r) => sum + r.credit, 0);
  const totalPaid = unifiedRows.reduce((sum, r) => sum + r.debit, 0);
  const currentNetBalance = supplier.balance;

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setFormError('يرجى كتابة مبلغ صحيح أكبر من الصفر');
      return;
    }

    if (!notes.trim()) {
      setFormError('يرجى كتابة بيان أو سبب القيد لتوضيحه في الأجندة');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const entryId = `led-${Date.now()}`;
      const entryNumber = `AGD-${Date.now().toString().slice(-6)}`;

      // 1. Add to supplier ledger
      await db.supplierLedger.add({
        id: entryId,
        entryNumber,
        supplierId: supplier.id,
        supplierName: supplier.name,
        type: entryType,
        amount: numAmount,
        date,
        notes: notes.trim(),
        paymentMethod: entryType === 'payment' ? paymentMethod : undefined,
        affectTreasury: entryType === 'payment' ? affectTreasury : false,
        createdBy: currentAccount?.name || 'المحاسب',
        createdAt: now,
      });

      // 2. Adjust supplier balance and totals
      if (entryType === 'debt') {
        await db.suppliers.update(supplier.id, {
          balance: supplier.balance + numAmount,
          totalPurchases: supplier.totalPurchases + numAmount,
          updatedAt: now,
        });
      } else if (entryType === 'payment') {
        const newBalance = Math.max(0, supplier.balance - numAmount);
        await db.suppliers.update(supplier.id, {
          balance: newBalance,
          totalPaid: supplier.totalPaid + numAmount,
          updatedAt: now,
        });

        // Add payment receipt record
        await db.payments.add({
          id: `pay-${Date.now()}`,
          receiptNumber: entryNumber,
          type: 'supplier_payment',
          partyId: supplier.id,
          partyName: supplier.name,
          amount: numAmount,
          paymentMethod,
          date,
          notes: notes.trim(),
          createdBy: currentAccount?.name || 'المحاسب',
          createdAt: now,
        });

        // Add treasury expense if enabled
        if (affectTreasury) {
          await db.transactions.add({
            id: `tx-${Date.now()}`,
            type: 'expense',
            category: 'supplier_payment',
            categoryLabel: 'سداد دفعة لمورد مواتير (أجندة)',
            amount: numAmount,
            title: `دفعة للمورد: ${supplier.name} (${notes.trim()})`,
            notes: `رقم القيد بالأجندة: ${entryNumber} - الرصيد بعد الحركة: ${newBalance.toLocaleString('en-US')} ج.م`,
            date,
            relatedId: entryId,
            createdBy: currentAccount?.name || 'المحاسب',
            createdAt: now,
          });
        }
      } else if (entryType === 'discount') {
        const newBalance = Math.max(0, supplier.balance - numAmount);
        await db.suppliers.update(supplier.id, {
          balance: newBalance,
          updatedAt: now,
        });
      }

      // Reset form
      setAmount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (err: unknown) {
      console.error(err);
      setFormError('حدث خطأ أثناء حفظ القيد في الأجندة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (row: UnifiedAgendaRow) => {
    if (!row.canDelete) return;

    if (!window.confirm(`هل أنت متأكد من حذف هذا القيد بقيمة ${row.credit || row.debit} ج.م؟ سيتم تعديل رصيد المورد تلقائياً.`)) {
      return;
    }

    try {
      const now = new Date().toISOString();
      // Reverse balance change
      if (row.type === 'debt') {
        const newBalance = Math.max(0, supplier.balance - row.credit);
        const newPurchases = Math.max(0, supplier.totalPurchases - row.credit);
        await db.suppliers.update(supplier.id, {
          balance: newBalance,
          totalPurchases: newPurchases,
          updatedAt: now,
        });
      } else {
        // Payment or discount reversed: add back to balance
        await db.suppliers.update(supplier.id, {
          balance: supplier.balance + row.debit,
          totalPaid: row.type === 'payment' ? Math.max(0, supplier.totalPaid - row.debit) : supplier.totalPaid,
          updatedAt: now,
        });

        // Delete associated treasury transaction if exists
        await db.transactions.where('relatedId').equals(row.rawId).delete();
      }

      await db.supplierLedger.delete(row.rawId);
    } catch (err) {
      console.error(err);
      alert('فشل حذف القيد');
    }
  };

  const handleExportCsv = () => {
    const headers = ['التاريخ', 'نوع الحركة', 'البيان', 'دائن (له)', 'مدين (منه)', 'الرصيد بعد الحركة', 'المسؤول'];
    const csvData = unifiedRows.map((r) => [
      r.date,
      r.label,
      r.description,
      r.credit || 0,
      r.debit || 0,
      r.runningBalance || 0,
      r.createdBy || 'النظام',
    ]);
    exportToCsv(`أجندة_حساب_${supplier.name.replace(/\s+/g, '_')}`, headers, csvData);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-black rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[96vh]">
        {/* Header Controls */}
        <div className="no-print bg-zinc-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide">أجندة ديون وحسابات المورد</h3>
                <span className="text-[11px] bg-zinc-800 text-amber-300 font-semibold px-2 py-0.5 rounded-md">
                  {supplier.name}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                دفتر الأستاذ المالي المباشر — تسجيل الديون والمسحوبات والدفعات والتسويات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الأجندة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
          {/* Printable Document Header (Appears only on print) */}
          <div className="hidden print:block mb-4 border-b-2 border-black pb-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">{settings.shopName}</h1>
                <p className="text-xs text-zinc-600">دفتر أستاذ وأجندة حساب المورد</p>
              </div>
              <div className="text-left text-xs">
                <div>المورد: <strong>{supplier.name}</strong></div>
                <div>الهاتف: {supplier.phone}</div>
                <div>تاريخ التقرير: {new Date().toISOString().split('T')[0]}</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                إجمالي الديون والمسحوبات (دائن)
              </span>
              <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {totalDebts.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
                إجمالي المسدد والتسويات (مدين)
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {totalPaid.toLocaleString('en-US')} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>

            <div className="bg-amber-500/10 dark:bg-amber-500/15 p-3.5 rounded-xl border border-amber-500/30 shadow-xs">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block mb-1">
                صافي الدين المستحق له بذمتنا الآن
              </span>
              <span className="text-xl font-extrabold font-mono text-amber-700 dark:text-amber-300">
                {currentNetBalance.toLocaleString('en-US')} <span className="text-xs font-bold">ج.م</span>
              </span>
            </div>
          </div>

          {/* New Entry Formulation Panel */}
          <div className="no-print bg-white dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <PlusCircle className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                تسجيل قيد جديد في أجندة المورد
              </h4>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                (يمكنك زيادة الدين، تسجيل دفعة، أو تسوية بضاعة وملاحظات)
              </span>
            </div>

            {formError && (
              <div className="mb-3 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddEntry} className="space-y-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEntryType('debt')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    entryType === 'debt'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>دين جديد على المحل (له)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryType('payment')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    entryType === 'payment'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>دفعة مسددة للمورد (منه)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryType('discount')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                    entryType === 'discount'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>خصم مسموح به / تسوية</span>
                </button>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    المبلغ (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    تاريخ القيد
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {entryType === 'payment' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      طريقة الصرف
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank' | 'wallet')}
                      className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="cash">نقدي (كاش)</option>
                      <option value="bank">تحويل بنكي</option>
                      <option value="wallet">فودافون كاش / محفظة</option>
                    </select>
                  </div>
                )}

                <div className={entryType === 'payment' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    البيان والملاحظات الدفترية *
                  </label>
                  <input
                    type="text"
                    placeholder={
                      entryType === 'debt'
                        ? 'مثال: سحب بضاعة قطع غيار / فرق حساب مكنة'
                        : entryType === 'payment'
                        ? 'مثال: دفعة تحت الحساب مع السائق أحمد'
                        : 'مثال: خصم متفق عليه لتلف جزء بالبضاعة'
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Payment Specific Checkbox */}
              {entryType === 'payment' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="agendaAffectTreasury"
                    checked={affectTreasury}
                    onChange={(e) => setAffectTreasury(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 border-zinc-300 dark:border-zinc-700 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="agendaAffectTreasury" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    تسجيل خروج المبلغ من خزينة المحل تلقائياً (مصروف نقدية)
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-black transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'جارٍ الحفظ...' : 'حفظ القيد في الأجندة'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Agenda Table Controls */}
          <div className="no-print flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                سجل القيود الدفترية ({filteredRows.length}):
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setFilterType('debt')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  filterType === 'debt'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                الديون فقط (له)
              </button>
              <button
                type="button"
                onClick={() => setFilterType('payment')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  filterType === 'payment'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                الدفعات فقط (منه)
              </button>
            </div>
          </div>

          {/* Unified Ledger Table */}
          <div id="printable-area" className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">نوع الحركة</th>
                    <th className="py-2.5 px-3">البيان والملاحظات</th>
                    <th className="py-2.5 px-3 text-left">دائن (له)</th>
                    <th className="py-2.5 px-3 text-left">مدين (منه)</th>
                    <th className="py-2.5 px-3 text-left">الرصيد بعد القيد</th>
                    <th className="py-2.5 px-3 text-center no-print">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredRows.map((r) => {
                    const isDebt = r.type === 'debt';
                    return (
                      <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-zinc-700 dark:text-zinc-300">
                          {r.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDebt
                                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                                : r.type === 'payment'
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                                : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            {r.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-900 dark:text-zinc-100 font-medium max-w-xs truncate">
                          {r.description}
                          {r.paymentMethod && (
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mr-1.5 font-normal">
                              ({r.paymentMethod === 'cash' ? 'نقدي' : r.paymentMethod === 'bank' ? 'بنكي' : 'محفظة'})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold">
                          {r.credit > 0 ? (
                            <span className="text-rose-700 dark:text-rose-400">
                              +{r.credit.toLocaleString('en-US')} ج.م
                            </span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold">
                          {r.debit > 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              -{r.debit.toLocaleString('en-US')} ج.م
                            </span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-extrabold text-zinc-900 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/30">
                          {typeof r.runningBalance === 'number'
                            ? `${r.runningBalance.toLocaleString('en-US')} ج.م`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center no-print">
                          {r.canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(r)}
                              className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title="حذف هذا القيد واسترجاع الرصيد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                        لا توجد قيود مسجلة في أجندة هذا المورد بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
