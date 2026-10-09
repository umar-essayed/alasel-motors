import React, { useState } from 'react';
import { db } from '../../db';
import { Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, HandCoins, CheckCircle2, AlertCircle, Printer } from 'lucide-react';

interface CustomerPaymentModalProps {
  customer: Customer | null;
  onClose: () => void;
  onPaymentSaved: () => void;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  customer,
  onClose,
  onPaymentSaved,
}) => {
  const { currentAccount } = useAuth();
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'wallet'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<{
    receiptNumber: string;
    amount: number;
    date: string;
    newBalance: number;
  } | null>(null);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      setError('يرجى كتابة مبلغ سداد صحيح أكبر من صفر');
      return;
    }

    if (payAmount > customer.balance) {
      if (!window.confirm(`المبلغ المدخل (${payAmount.toLocaleString('ar-EG')} ج.م) أكبر من إجمالي الآجل المستحق (${customer.balance.toLocaleString('ar-EG')} ج.م). هل تريد المتابعة؟`)) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];
      const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
      const newBalance = Math.max(0, customer.balance - payAmount);

      // 1. Add Payment record
      await db.payments.add({
        id: `pay-${Date.now()}`,
        receiptNumber,
        type: 'customer_payment',
        partyId: customer.id,
        partyName: customer.name,
        amount: payAmount,
        paymentMethod,
        date: todayDate,
        notes: notes.trim(),
        createdBy: currentAccount?.name || 'الكاشير',
        createdAt: now,
      });

      // 2. Add Treasury transaction
      await db.transactions.add({
        id: `tx-${Date.now()}`,
        type: 'income',
        category: 'customer_payment',
        categoryLabel: 'تحصيل دفعة آجل من عميل',
        amount: payAmount,
        title: `تحصيل دفعة - عميل: ${customer.name} (إيصال ${receiptNumber})`,
        notes: notes.trim() || `المتبقي بعد الدفعة: ${newBalance.toLocaleString('ar-EG')} ج.م`,
        date: todayDate,
        createdBy: currentAccount?.name || 'الكاشير',
        createdAt: now,
      });

      // 3. Update Customer's balance
      await db.customers.update(customer.id, {
        totalPaid: customer.totalPaid + payAmount,
        balance: newBalance,
        updatedAt: now,
      });

      setSavedReceipt({
        receiptNumber,
        amount: payAmount,
        date: todayDate,
        newBalance,
      });

      onPaymentSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدفعة';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !savedReceipt) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>إيصال استلام نقدية - ${savedReceipt.receiptNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; max-width: 600px; margin: 0 auto; }
            .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 15px; text-align: center; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .amount-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>الوكالة موتورز لمواتير ومكن السيارات</h2>
            <p>إيصال استلام نقدية وسداد دفعة آجل</p>
          </div>
          <div class="row">
            <div><strong>رقم الإيصال:</strong> ${savedReceipt.receiptNumber}</div>
            <div><strong>التاريخ:</strong> ${savedReceipt.date}</div>
          </div>
          <div class="row">
            <div><strong>وصلنا من السيد / الأسطى:</strong> ${customer.name}</div>
            <div><strong>هاتف:</strong> ${customer.phone}</div>
          </div>
          <div class="amount-box">
            المبلغ المدفوع: ${savedReceipt.amount.toLocaleString('ar-EG')} جنيه مصري لا غير
          </div>
          <div class="row">
            <div><strong>طريقة السداد:</strong> ${paymentMethod === 'cash' ? 'نقداً بالخزينة' : paymentMethod === 'wallet' ? 'محفظة إلكترونية' : 'تحويل بنكي'}</div>
            <div><strong>الآجل المتبقي بذمته:</strong> ${savedReceipt.newBalance.toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div class="signatures">
            <div>توقيع المستلم والخزينة</div>
            <div>توقيع العميل / المسدد</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">سند قبض دفعة من العميل</h3>
              <p className="text-xs text-slate-400">{customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedReceipt ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-slate-900">
              تم تحصيل الدفعة بنجاح وتحديث الحساب!
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-right">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم السند:</span>
                <span className="font-mono font-bold">{savedReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المبلغ المقبوض:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {savedReceipt.amount.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">الآجل المتبقي على العميل:</span>
                <span className="font-mono font-bold text-amber-800">
                  {savedReceipt.newBalance.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>طباعة إيصال القبض</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Balance banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex justify-between items-center text-xs">
              <span className="text-amber-900 font-bold">إجمالي الآجل المستحق عليه:</span>
              <span className="font-mono font-extrabold text-base text-amber-950">
                {customer.balance.toLocaleString('ar-EG')} ج.م
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المبلغ المسدد الآن *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="اكتب المبلغ..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-emerald-700 focus:bg-white focus:outline-none"
                />
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">ج.م</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                طريقة استلام النقدية
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
              >
                <option value="cash">نقداً في الخزينة (كاش)</option>
                <option value="wallet">محفظة إلكترونية (فودافون كاش / إنستاباي)</option>
                <option value="bank">إيداع / تحويل بنكي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات أو بيان السداد
              </label>
              <input
                type="text"
                placeholder="مثال: قسط الأسبوع الأول لمكنة الإلنترا"
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
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'جارٍ الحفظ...' : 'تأكيد القبض وتحديث الحساب'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
