import React, { useState } from 'react';
import { db } from '../../db';
import { SalesInvoice } from '../../types';
import { X, CheckCircle, FileText, User, Phone, MapPin } from 'lucide-react';

interface ClearanceHandoverModalProps {
  invoice: SalesInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ClearanceHandoverDialog: React.FC<{
  invoice: SalesInvoice;
  onClose: () => void;
  onSaved: () => void;
}> = ({ invoice, onClose, onSaved }) => {
  const [delivered, setDelivered] = useState(invoice.clearanceDelivered ?? true);
  const [deliveryDate, setDeliveryDate] = useState(
    invoice.clearanceDeliveryDate || new Date().toISOString().split('T')[0]
  );
  const [recipientName, setRecipientName] = useState(
    invoice.clearanceRecipientName || invoice.customerName || ''
  );
  const [recipientPhone, setRecipientPhone] = useState(
    invoice.clearanceRecipientPhone || invoice.customerPhone || ''
  );
  const [trafficDepartment, setTrafficDepartment] = useState(
    invoice.clearanceTrafficDepartment || ''
  );
  const [notes, setNotes] = useState(invoice.clearanceDeliveryNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delivered && !recipientName.trim()) {
      setError('يرجى كتابة اسم المستلم الفعلي لأوراق الإفراج');
      return;
    }

    setIsSaving(true);
    try {
      await db.salesInvoices.update(invoice.id, {
        clearanceDelivered: delivered,
        clearanceDeliveryDate: delivered ? deliveryDate : undefined,
        clearanceRecipientName: delivered ? recipientName.trim() : undefined,
        clearanceRecipientPhone: delivered ? recipientPhone.trim() : undefined,
        clearanceTrafficDepartment: delivered ? trafficDepartment.trim() : undefined,
        clearanceDeliveryNotes: notes.trim(),
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ حالة التسليم');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-zinc-900 dark:bg-black text-white px-5 py-3.5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">تسليم ورق الإفراج الجمركي</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Invoice & Engine Summary Box */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">الفاتورة:</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">المحرك:</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                {invoice.engineTitle} ({invoice.engineNumber})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">المشتري المسجل بالفاتورة (الميكانيكي/التاجر):</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-300">
                {invoice.customerName}
              </span>
            </div>
          </div>

          {/* Checkbox: Delivered Status */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 cursor-pointer">
            <input
              type="checkbox"
              checked={delivered}
              onChange={(e) => setDelivered(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                تم تسليم أوراق الإفراج الجمركي الأصلية
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                تأكيد خروج المستندات من المحل للمشتري أو صاحب السيارة
              </span>
            </div>
          </label>

          {delivered && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  تاريخ التسليم *
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>اسم المستلم الفعلي (صاحب السيارة/المرخص) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم الرباعي للمستلم..."
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>رقم هاتف المستلم</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="هاتف صاحب الشأن..."
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>وحدة المرور المتوجه إليها (الترخيص)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: مرور فيصل، مرور العجوزة، مرور طنطا..."
                  value={trafficDepartment}
                  onChange={(e) => setTrafficDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  ملاحظات الاستلام
                </label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول التوكيلات أو صور البطاقة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ بيانات التسليم'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ClearanceHandoverModal: React.FC<ClearanceHandoverModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSaved,
}) => {
  if (!isOpen || !invoice) return null;
  return (
    <ClearanceHandoverDialog
      invoice={invoice}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
};
