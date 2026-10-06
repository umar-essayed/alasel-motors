import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../utils/exportUtils';
import {
  Plus,
  Minus,
  Search,
  X,
  Download,
} from 'lucide-react';

export const TreasuryView: React.FC = () => {
  const { currentAccount } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Transaction['category']>('general_expense');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const transactions = useLiveQuery(() => db.transactions.reverse().sortBy('createdAt')) || [];
  const sales = useLiveQuery(() => db.salesInvoices.filter((s) => s.status !== 'returned').toArray()) || [];

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentCash = totalIncome - totalExpense;
  const totalSalesProfit = sales.reduce((sum, s) => sum + s.profit, 0);

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      t.categoryLabel.toLowerCase().includes(q);

    const matchType = typeFilter === 'all' || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0 || !title.trim()) {
      setError('يرجى إدخال مبلغ صحيح والبيان');
      return;
    }

    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];

    let categoryLabel = 'مصروف عام';
    if (category === 'rent') categoryLabel = 'إيجار';
    else if (category === 'salaries') categoryLabel = 'مرتبات';
    else if (category === 'shipping') categoryLabel = 'شحن ونقل';
    else if (category === 'refund') categoryLabel = 'مرتجع مبيعات';
    else if (txType === 'income') categoryLabel = 'إيداع نقدية';

    await db.transactions.add({
      id: `tx-${Date.now()}`,
      type: txType,
      category,
      categoryLabel,
      amount: amt,
      title: title.trim(),
      notes: notes.trim(),
      date: todayDate,
      createdBy: currentAccount?.name || 'المحاسب',
      createdAt: now,
    });

    setIsModalOpen(false);
    setAmount('');
    setTitle('');
    setNotes('');
  };

  const handleExportCsv = () => {
    const headers = ['التاريخ', 'النوع', 'التصنيف', 'البيان', 'المسؤول', 'المبلغ'];
    const rows = filtered.map((t) => [
      t.date,
      t.type === 'income' ? 'وارد' : 'منصرف',
      t.categoryLabel,
      t.title,
      t.createdBy,
      t.amount,
    ]);
    exportToCsv('حركات_الخزينة_الأصيل', headers, rows);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">الخزينة والسيولة النقدية</h2>
          <span className="text-[11px] text-zinc-400">حركة النقدية والمصروفات والواردات</span>
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
            onClick={() => {
              setTxType('income');
              setCategory('sale');
              setTitle('إيداع نقدية');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إيداع نقدية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTxType('expense');
              setCategory('general_expense');
              setTitle('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>تسجيل مصروف</span>
          </button>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-zinc-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 block">رصيد الخزينة الحالي</span>
          <span className="font-mono text-base font-bold text-zinc-900 block mt-0.5">
            {currentCash.toLocaleString('en-US')} ج.م
          </span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 block">إجمالي الوارد</span>
          <span className="font-mono text-base font-bold text-emerald-700 block mt-0.5">
            {totalIncome.toLocaleString('en-US')} ج.م
          </span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 block">إجمالي المنصرف</span>
          <span className="font-mono text-base font-bold text-rose-700 block mt-0.5">
            {totalExpense.toLocaleString('en-US')} ج.م
          </span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-zinc-500 block">صافي أرباح المبيعات</span>
          <span className="font-mono text-base font-bold text-zinc-900 block mt-0.5">
            +{totalSalesProfit.toLocaleString('en-US')} ج.م
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border border-zinc-200 rounded-xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="بحث في حركات الخزينة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              typeFilter === 'all' ? 'bg-white text-zinc-900 font-semibold shadow-xs' : 'text-zinc-600'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('income')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              typeFilter === 'income' ? 'bg-white text-zinc-900 font-semibold shadow-xs' : 'text-zinc-600'
            }`}
          >
            الوارد
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              typeFilter === 'expense' ? 'bg-white text-zinc-900 font-semibold shadow-xs' : 'text-zinc-600'
            }`}
          >
            المنصرف
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">التاريخ</th>
                <th className="py-2.5 px-4">التصنيف</th>
                <th className="py-2.5 px-4">البيان</th>
                <th className="py-2.5 px-4">المسؤول</th>
                <th className="py-2.5 px-4 text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((tx) => {
                const isIncome = tx.type === 'income';

                return (
                  <tr key={tx.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-zinc-500">{tx.date}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
                          isIncome
                            ? 'text-emerald-700 bg-emerald-50'
                            : tx.category === 'refund'
                            ? 'text-amber-800 bg-amber-50'
                            : 'text-rose-700 bg-rose-50'
                        }`}
                      >
                        {tx.categoryLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-zinc-800">
                      <div>{tx.title}</div>
                      {tx.notes && <span className="text-[11px] text-zinc-400 block">{tx.notes}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500">{tx.createdBy}</td>
                    <td
                      className={`py-2.5 px-4 text-left font-mono font-bold ${
                        isIncome ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{tx.amount.toLocaleString('en-US')} ج.م
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                    لا توجد حركات مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-xs font-bold text-zinc-900">
                {txType === 'income' ? 'إيداع نقدية في الخزينة' : 'تسجيل مصروف صادر'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  autoFocus
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              {txType === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع المصروف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Transaction['category'])}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                  >
                    <option value="general_expense">مصروف عام</option>
                    <option value="rent">إيجار</option>
                    <option value="salaries">مرتبات</option>
                    <option value="shipping">شحن ونقل</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">البيان *</label>
                <input
                  type="text"
                  required
                  placeholder="وصف الحركة..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="اختياري..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
                >
                  حفظ الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
