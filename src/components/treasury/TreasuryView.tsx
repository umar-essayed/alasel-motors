import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  WalletCards,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
  Search,
  Filter,
  Receipt,
  Calendar,
  DollarSign,
  X,
} from 'lucide-react';

export const TreasuryView: React.FC = () => {
  const { currentAccount } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // New Transaction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Transaction['category']>('general_expense');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const transactions = useLiveQuery(() => db.transactions.reverse().sortBy('createdAt')) || [];
  const soldEngines = useLiveQuery(() => db.engines.where('status').equals('sold').toArray()) || [];
  const salesInvoices = useLiveQuery(() => db.salesInvoices.toArray()) || [];

  // Financial calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentCashInDrawer = totalIncome - totalExpense;

  const totalEngineSalesProfit = salesInvoices.reduce((sum, inv) => sum + inv.profit, 0);

  const filteredTransactions = transactions.filter((t) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      t.categoryLabel.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('يرجى كتابة مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!title.trim()) {
      setError('يرجى كتابة بيان المعاملة');
      return;
    }

    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];

    let categoryLabel = 'مصروف عام';
    if (category === 'rent') categoryLabel = 'إيجار مقر أو مخزن';
    else if (category === 'salaries') categoryLabel = 'مرتبات وعمالة';
    else if (category === 'shipping') categoryLabel = 'شحن ونقل مواتير';
    else if (txType === 'income') categoryLabel = 'إيداع نقدي بالخزينة';

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
    <div className="space-y-5">
      {/* Treasury Header & Balances */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                الخزينة النقدية وصافي الأرباح
              </h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                حسابات حية ومحدثة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              متابعة حركة النقدية الفعلية في الدرج والمصروفات وصافي ربح مكن السيارات
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTxType('income');
                setCategory('sale');
                setTitle('إيداع نقدية إضافية في الخزينة');
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

        {/* Financial Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-900 text-white rounded-xl p-4 sm:col-span-1 col-span-2">
            <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider">
              رصيد الخزينة الفعلي الحالي (الدرج)
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white block mt-1">
              {currentCashInDrawer.toLocaleString('ar-EG')} ج.م
            </span>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-emerald-800 block flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              إجمالي المقبوض بالخزينة (وارد)
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-950 font-mono mt-1 block">
              {totalIncome.toLocaleString('ar-EG')} ج.م
            </span>
          </div>

          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-rose-800 block flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              إجمالي المصروفات والسحوبات
            </span>
            <span className="text-lg sm:text-xl font-bold text-rose-950 font-mono mt-1 block">
              {totalExpense.toLocaleString('ar-EG')} ج.م
            </span>
          </div>

          <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-purple-800 block flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              صافي أرباح بيع المكن
            </span>
            <span className="text-lg sm:text-xl font-bold text-purple-950 font-mono mt-1 block">
              +{totalEngineSalesProfit.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Tabs / Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في المعاملات، المصروفات، أو اسم المودع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            كل الحركات
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('income')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              typeFilter === 'income' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
            }`}
          >
            الوارد (مقبوضات)
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              typeFilter === 'expense' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600'
            }`}
          >
            المصروفات
          </button>
        </div>
      </div>

      {/* Transactions Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800">
            دفتر يومية الخزينة ({filteredTransactions.length} حركة)
          </h3>
          <span className="text-xs text-slate-400">تحديث فوري</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            لا توجد حركات مسجلة تطابق البحث
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">نوع الحركة والتصنيف</th>
                  <th className="py-3 px-4">البيان والتفاصيل</th>
                  <th className="py-3 px-4">المسؤول</th>
                  <th className="py-3 px-4 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.categoryLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{tx.title}</span>
                        {tx.notes && <span className="text-[11px] text-slate-400">{tx.notes}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tx.createdBy}
                      </td>
                      <td className={`py-3 px-4 text-left font-mono font-bold text-sm ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isIncome ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')} ج.م
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {txType === 'income' ? 'تسجيل إيداع نقدي بالخزينة' : 'تسجيل مصروف من الخزينة'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="اكتب المبلغ..."
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">ج.م</span>
                </div>
              </div>

              {txType === 'expense' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تصنيف المصروف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                  >
                    <option value="general_expense">مصروفات نثرية عامة</option>
                    <option value="rent">إيجار مخزن / ورشة</option>
                    <option value="salaries">مرتبات وعمالة</option>
                    <option value="shipping">شحن ونقل وتنزيل حاويات</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / الوصف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فاتورة كهرباء أو إيجار شهر إبريل"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="أي تفاصيل أخرى..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer ${
                    txType === 'income' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {txType === 'income' ? 'تأكيد الإيداع' : 'تأكيد الصرف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
