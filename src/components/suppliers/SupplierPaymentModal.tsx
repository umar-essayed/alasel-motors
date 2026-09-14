import React, { useState } from 'react';
import { db } from '../../db';
import { Supplier } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, SendHorizontal, AlertCircle } from 'lucide-react';

interface SupplierPaymentModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  onPaymentSaved: () => void;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  supplier,
  onClose,
  onPaymentSaved,
}) => {
  const { currentAccount } = useAuth();
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'wallet'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!supplier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      setError('يرجى إدخال مبلغ سداد صحيح');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];
      const receiptNumber = `PAY-SUP-${Date.now().toString().slice(-6)}`;
      const newBalance = Math.max(0, supplier.balance - payAmount);

      // 1. Add payment record
      await db.payments.add({
        id: `pay-${Date.now()}`,
        receiptNumber,
        type: 'supplier_payment',
        partyId: supplier.id,
        partyName: supplier.name,
        amount: payAmount,
        paymentMethod,
        date: todayDate,
        notes: notes.trim(),
        createdBy: currentAccount?.name || 'المحاسب',
        createdAt: now,
      });

      // 2. Add Treasury Expense
      await db.transactions.add({
        id: `tx-${Date.now()}`,
        type: 'expense',
        category: 'supplier_payment',
        categoryLabel: 'سداد دفعة لمورد مواتير',
        amount: payAmount,
        title: `سداد للمورد: ${supplier.name} (${receiptNumber})`,
        notes: notes.trim() || `المتبقي له بعد السداد: ${newBalance.toLocaleString('ar-EG')} ج.م`,
        date: todayDate,
        createdBy: currentAccount?.name || 'المحاسب',
        createdAt: now,
      });

      // 3. Update Supplier Balance
      await db.suppliers.update(supplier.id, {
        totalPaid: supplier.totalPaid + payAmount,
        balance: newBalance,
        updatedAt: now,
      });

      onPaymentSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل السداد للمورد';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <SendHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">سداد دفعة نقدية للمورد</h3>
              <p className="text-xs text-slate-400">{supplier.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier current balance */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-slate-600 font-bold">المتبقي له بذمة المحل:</span>
            <span className="font-mono font-bold text-base text-rose-700">
              {supplier.balance.toLocaleString('ar-EG')} ج.م
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المبلغ المدفوع للمورد (صادر من الخزينة) *
            </label>
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الصرف</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
            >
              <option value="cash">نقداً من خزينة المحل (كاش)</option>
              <option value="bank">تحويل بنكي / شيك</option>
              <option value="wallet">محفظة إلكترونية</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات أو رقم الإيصال</label>
            <input
              type="text"
              placeholder="مثال: سداد قسط دفعة مواتير بورسعيد"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'جارٍ الحفظ...' : 'تأكيد الصرف وتحديث رصيد المورد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
