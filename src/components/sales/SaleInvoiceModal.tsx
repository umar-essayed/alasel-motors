import React from 'react';
import { SalesInvoice, ShopSettings } from '../../types';
import { Printer, X, ShieldCheck, Phone, MapPin, Receipt, Car, User } from 'lucide-react';

interface SaleInvoiceModalProps {
  invoice: SalesInvoice | null;
  settings: ShopSettings;
  onClose: () => void;
}

export const SaleInvoiceModal: React.FC<SaleInvoiceModalProps> = ({
  invoice,
  settings,
  onClose,
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[95vh]">
        {/* Top bar controls (hidden in print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">فاتورة بيع وضمان مكنة سيارة</h3>
            <span className="font-mono text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded">
              {invoice.invoiceNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div
          id="printable-area"
          className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans"
        >
          {/* Shop Header */}
          <div className="border-b-2 border-slate-800 pb-5 mb-5 flex justify-between items-start">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
                {settings.shopName}
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-1">
                إدارة: {settings.shopOwner} • {settings.commercialRecord}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {settings.address}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {settings.phone1} - {settings.phone2}
                </span>
              </div>
            </div>

            <div className="text-left">
              <span className="inline-block bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1 rounded-lg">
                فاتورة رقم: {invoice.invoiceNumber}
              </span>
              <div className="text-xs text-slate-500 mt-1">
                التاريخ: <strong className="text-slate-800">{invoice.date}</strong>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                المسؤول: <span className="text-slate-800">{invoice.createdBy}</span>
              </div>
            </div>
          </div>

          {/* Customer & Car Info Strip */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            <div>
              <span className="font-bold text-slate-500 block mb-1">بيانات العميل والمشتري:</span>
              <div className="text-sm font-bold text-slate-900">{invoice.customerName}</div>
              <div className="text-slate-600 mt-0.5">هاتف: {invoice.customerPhone}</div>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">رقم شاسيه السيارة المركب عليها:</span>
              <div className="font-mono text-sm font-bold text-slate-800">
                {invoice.chassisNumber || 'غير مسجل بالفاتورة'}
              </div>
              <div className="text-slate-500 mt-0.5">طريقة الدفع: {invoice.paymentType === 'cash' ? 'سداد نقدي كامل (كاش)' : 'بيع آجل / دفعات'}</div>
            </div>
          </div>

          {/* Sold Engine Specification Table */}
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              بيانات المكنة / المحرك المباع:
            </h2>
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">البيان والموديل</th>
                    <th className="py-2.5 px-3">رقم المكنة المدموغ (Engine No)</th>
                    <th className="py-2.5 px-3 text-left">السعر الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                      {invoice.engineTitle}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-extrabold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {invoice.engineNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-slate-900 text-sm">
                      {invoice.totalAmount.toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Box */}
          <div className="flex justify-end mb-6">
            <div className="w-72 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>إجمالي الفاتورة:</span>
                <span className="font-mono font-bold">{invoice.totalAmount.toLocaleString('ar-EG')} ج.م</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>الخصم:</span>
                  <span className="font-mono font-bold">- {invoice.discount.toLocaleString('ar-EG')} ج.م</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5 text-sm">
                <span>الصافي المطلوب:</span>
                <span className="font-mono">{invoice.finalAmount.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>المدفوع نقداً (المسدد):</span>
                <span className="font-mono">{invoice.paidAmount.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold border-t border-slate-200 pt-1.5">
                <span>الآجل المتبقي:</span>
                <span className="font-mono text-sm">{invoice.remainingAmount.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
          </div>

          {/* Warranty Terms and Conditions */}
          <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-4 mb-6 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>فترة وشروط الضمان المعتمدة:</span>
            </div>
            <p className="font-semibold text-slate-800">
              {invoice.warrantyPeriod || settings.defaultWarranty}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {settings.invoiceNotice}
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs">
            <div>
              <span className="text-slate-500 block mb-8 font-semibold">توقيع المشتري / المستلم</span>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
            </div>
            <div>
              <span className="text-slate-500 block mb-8 font-semibold">ختم وتوقيع إدارة محل الأصيل</span>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
