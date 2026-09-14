import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  WalletCards,
  PlusCircle,
  MinusCircle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  X,
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
  const sales = useLiveQuery(() => db.salesInvoices.toArray()) || [];

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">الخزينة النقدية والأرباح</h2>
          <span className="text-xs text-slate-400">حركة النقدية الفعلية ومصروفات المحل</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTxType('income');
              setCategory('sale');
              setTitle('إيداع نقدية');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
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
            className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <MinusCircle className="w-4 h-4" />
            <span>تسجيل مصروف</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">رصيد الخزينة (الدرج)</span>
          <span className="font-mono text-2xl font-bold text-slate-900 block mt-1">
            {currentCash.toLocaleString('en-US')} ج.م
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي الوارد للخزينة</span>
          <span className="font-mono text-xl font-bold text-emerald-700 block mt-1">
            {totalIncome.toLocaleString('en-US')} ج.م
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي المنصرف</span>
          <span className="font-mono text-xl font-bold text-rose-700 block mt-1">
            {totalExpense.toLocaleString('en-US')} ج.م
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">صافي أرباح بيع المكن</span>
          <span className="font-mono text-xl font-bold text-purple-700 block mt-1">
            +{totalSalesProfit.toLocaleString('en-US')} ج.م
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في حركات الخزينة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('income')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              typeFilter === 'income' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            الوارد
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              typeFilter === 'expense' ? 'bg-white text-rose-800 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            المنصرف
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">البيان</th>
                <th className="py-3 px-4">المسؤول</th>
                <th className="py-3 px-4 text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tx) => {
                const isIncome = tx.type === 'income';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">{tx.date}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isIncome ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {tx.categoryLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{tx.title}</span>
                      {tx.notes && <span className="text-[11px] text-slate-400">{tx.notes}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{tx.createdBy}</td>
                    <td className={`py-3.5 px-4 text-left font-mono font-bold text-sm ${
                      isIncome ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {isIncome ? '+' : '-'}{tx.amount.toLocaleString('en-US')} ج.م
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    لا توجد حركات مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {txType === 'income' ? 'إيداع نقدية في الخزينة' : 'تسجيل مصروف'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              {error && <div className="text-rose-600 text-xs font-bold">{error}</div>}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold"
                />
              </div>

              {txType === 'expense' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع المصروف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="general_expense">مصروف عام</option>
                    <option value="rent">إيجار</option>
                    <option value="salaries">مرتبات</option>
                    <option value="shipping">شحن ونقل مواتير</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان *</label>
                <input
                  type="text"
                  required
                  placeholder="الوصف..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl cursor-pointer ${
                    txType === 'income' ? 'bg-emerald-700' : 'bg-rose-700'
                  }`}
                >
                  تأكيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
