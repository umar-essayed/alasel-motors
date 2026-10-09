import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Supplier, Engine, PaymentReceipt, ShopSettings } from '../../types';
import { Printer, X, Truck, Receipt, ArrowUpRight } from 'lucide-react';

interface SupplierStatementModalProps {
  supplier: Supplier | null;
  settings: ShopSettings;
  onClose: () => void;
}

export const SupplierStatementModal: React.FC<SupplierStatementModalProps> = ({
  supplier,
  settings,
  onClose,
}) => {
  const [suppliedEngines, setSuppliedEngines] = useState<Engine[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);

  useEffect(() => {
    if (supplier) {
      Promise.all([
        db.engines.where('supplierId').equals(supplier.id).toArray(),
        db.payments.where('partyId').equals(supplier.id).toArray(),
      ]).then(([engList, payList]) => {
        setSuppliedEngines(engList);
        setPayments(payList);
      });
    }
  }, [supplier]);

  if (!supplier) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[95vh]">
        {/* Modal Controls */}
        <div className="no-print bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">كشف حساب مورد</h3>
            <span className="text-xs bg-slate-800 text-slate-200 px-2 py-0.5 rounded">
              {supplier.name}
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

        {/* Printable Area */}
        <div id="printable-area" className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans space-y-6">
          <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {settings.shopName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                كشف حساب مشتريات ودفعات المورد
              </p>
            </div>
            <div className="text-left text-xs text-slate-500">
              <div>تاريخ الكشف: <strong className="text-slate-900">{new Date().toISOString().split('T')[0]}</strong></div>
            </div>
          </div>

          {/* Supplier Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            <div>
              <span className="text-slate-400 block font-bold mb-0.5">اسم المورد:</span>
              <span className="text-sm font-bold text-slate-900">{supplier.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold mb-0.5">رقم الهاتف:</span>
              <span className="font-mono font-bold text-slate-900">{supplier.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold mb-0.5">المقر / الميناء:</span>
              <span className="text-slate-800">{supplier.address || 'غير مسجل'}</span>
            </div>
          </div>

          {/* Totals Banner */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي مشترياتنا منه</span>
              <span className="font-mono text-base font-bold text-slate-900">
                {supplier.totalPurchases.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 block">إجمالي المسدد له</span>
              <span className="font-mono text-base font-bold text-emerald-700">
                {supplier.totalPaid.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <span className="text-[11px] font-bold text-rose-900 block">المتبقي له بذمة المحل</span>
              <span className="font-mono text-lg font-extrabold text-rose-900">
                {supplier.balance.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>

          {/* Engines Supplied List */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              المواتير الواردة من المورد ({suppliedEngines.length}):
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">رقم المكنة</th>
                    <th className="py-2.5 px-3">البيان والموديل</th>
                    <th className="py-2.5 px-3 text-left">سعر الشراء (الجملة)</th>
                    <th className="py-2.5 px-3 text-center">الحالة بالمخزن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliedEngines.map((eng) => (
                    <tr key={eng.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{eng.engineNumber}</td>
                      <td className="py-2.5 px-3">{eng.carBrand} {eng.carModel}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {eng.costPrice.toLocaleString('ar-EG')} ج.م
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          eng.status === 'available' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                        }`}>
                          {eng.status === 'available' ? 'متاح بالمخزن' : 'تم بيعه'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {suppliedEngines.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-slate-400">
                        لا توجد مواتير مسجلة باسم هذا المورد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments Sent to Supplier */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
              سجل الدفعات المسددة للمورد ({payments.length}):
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">رقم السند</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">طريقة الصرف</th>
                    <th className="py-2.5 px-3">البيان</th>
                    <th className="py-2.5 px-3 text-left">المبلغ المسدد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                      <td className="py-2 px-3">{p.date}</td>
                      <td className="py-2 px-3">{p.paymentMethod}</td>
                      <td className="py-2 px-3 text-slate-600">{p.notes || '-'}</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-rose-700">
                        -{p.amount.toLocaleString('ar-EG')} ج.م
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-slate-400">
                        لم يتم تسجيل دفعات مسددة بعد
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
