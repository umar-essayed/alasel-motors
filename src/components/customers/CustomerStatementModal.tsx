import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Customer, SalesInvoice, PaymentReceipt, ShopSettings } from '../../types';
import { Printer, X, FileText, User, Phone, MapPin, Receipt, ArrowDownRight, ArrowUpLeft } from 'lucide-react';

interface CustomerStatementModalProps {
  customer: Customer | null;
  settings: ShopSettings;
  onClose: () => void;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customer,
  settings,
  onClose,
}) => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (customer) {
      setIsLoading(true);
      Promise.all([
        db.salesInvoices.where('customerId').equals(customer.id).toArray(),
        db.payments.where('partyId').equals(customer.id).toArray(),
      ]).then(([invList, payList]) => {
        setInvoices(invList);
        setPayments(payList);
        setIsLoading(false);
      });
    }
  }, [customer]);

  if (!customer) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[95vh]">
        {/* Top bar controls */}
        <div className="no-print bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">كشف حساب عميل تفصيلي</h3>
            <span className="text-xs bg-slate-800 text-slate-200 px-2 py-0.5 rounded">
              {customer.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب</span>
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

        {/* Printable Statement */}
        <div id="printable-area" className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans space-y-6">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {settings.shopName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                كشف حساب مبيعات ودفعات مواتير السيارات
              </p>
            </div>
            <div className="text-left text-xs text-slate-500">
              <div>تاريخ استخراج الكشف: <strong className="text-slate-900">{new Date().toISOString().split('T')[0]}</strong></div>
              <div>سجل تجاري: {settings.commercialRecord}</div>
            </div>
          </div>

          {/* Customer info card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            <div>
              <span className="text-slate-400 block font-bold mb-0.5">اسم العميل:</span>
              <span className="text-sm font-bold text-slate-900">{customer.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold mb-0.5">رقم التليفون:</span>
              <span className="font-mono font-bold text-slate-900">{customer.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold mb-0.5">العنوان / الورشة:</span>
              <span className="text-slate-800">{customer.address || 'غير محدد'}</span>
            </div>
          </div>

          {/* Financial Totals Summary Banner */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي المسحوبات (المواتير)</span>
              <span className="font-mono text-base font-bold text-slate-900">
                {customer.totalPurchases.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 block">إجمالي ما سدده العميل</span>
              <span className="font-mono text-base font-bold text-emerald-700">
                {customer.totalPaid.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-amber-900 block">الرصيد المدين المتبقي بذمته</span>
              <span className="font-mono text-lg font-extrabold text-amber-950">
                {customer.balance.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>

          {/* Section 1: Invoices Purchased */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              المواتير وفواتير الشراء المسجلة على العميل ({invoices.length}):
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">رقم وتاريخ الفاتورة</th>
                    <th className="py-2.5 px-3">المكنة ورقم المحرك المدموغ</th>
                    <th className="py-2.5 px-3 text-left">قيمة المكنة</th>
                    <th className="py-2.5 px-3 text-left">المسدد وقت الشراء</th>
                    <th className="py-2.5 px-3 text-left">الآجل المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                        <div className="text-[10px] text-slate-400">{inv.date}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{inv.engineTitle}</div>
                        <span className="font-mono font-bold text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {inv.engineNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {inv.finalAmount.toLocaleString('ar-EG')} ج.م
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono text-emerald-700 font-bold">
                        {inv.paidAmount.toLocaleString('ar-EG')} ج.م
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-800">
                        {inv.remainingAmount.toLocaleString('ar-EG')} ج.م
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-slate-400">
                        لا توجد فواتير مبيعات مسجلة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Payments History */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              سجل سداد الدفعات والأقساط ({payments.length}):
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">رقم السند</th>
                    <th className="py-2.5 px-3">تاريخ السداد</th>
                    <th className="py-2.5 px-3">طريقة الدفع</th>
                    <th className="py-2.5 px-3">ملاحظات</th>
                    <th className="py-2.5 px-3 text-left">المبلغ المسدد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                      <td className="py-2 px-3">{p.date}</td>
                      <td className="py-2 px-3">
                        {p.paymentMethod === 'cash' ? 'نقداً (كاش)' : p.paymentMethod === 'wallet' ? 'محفظة كاش' : 'تحويل بنكي'}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{p.notes || '-'}</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-emerald-700">
                        +{p.amount.toLocaleString('ar-EG')} ج.م
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-slate-400">
                        لم يتم تسجيل دفعات سداد إضافية بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal statement & sign */}
          <div className="border-t border-slate-200 pt-6 grid grid-cols-2 text-center text-xs text-slate-600">
            <div>
              <p className="mb-8 font-semibold">توقيع ومصادقة العميل بصحة الرصيد المتبقي</p>
              <div className="border-b border-dashed border-slate-400 w-44 mx-auto" />
            </div>
            <div>
              <p className="mb-8 font-semibold">توقيع وختم إدارة محل الأصيل موتورز</p>
              <div className="border-b border-dashed border-slate-400 w-44 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
