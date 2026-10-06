import React, { useState } from 'react';
import { SalesInvoice, ShopSettings } from '../../types';
import { Printer, X, Receipt, FileText } from 'lucide-react';

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
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('thermal');

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[95vh]">
        {/* Top Control Bar */}
        <div className="no-print bg-zinc-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-zinc-400" />
            <span className="font-bold text-xs">فاتورة #{invoice.invoiceNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="bg-zinc-800 p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  printFormat === 'thermal' ? 'bg-zinc-700 text-white font-semibold' : 'text-zinc-400'
                }`}
              >
                <Receipt className="w-3 h-3" />
                <span>إيصال 80مم</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  printFormat === 'a4' ? 'bg-zinc-700 text-white font-semibold' : 'text-zinc-400'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>فاتورة A4</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white text-zinc-900 hover:bg-zinc-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-zinc-900 font-sans">
          {printFormat === 'thermal' ? (
            /* 80mm Thermal Receipt Layout */
            <div
              id="printable-area"
              className="max-w-[340px] mx-auto text-center font-mono text-xs border border-dashed border-zinc-300 p-4 rounded-xl space-y-3"
            >
              <div className="border-b border-dashed border-zinc-300 pb-3">
                <img src="/logo.png" alt="" className="w-10 h-10 mx-auto object-contain mb-1" />
                <h2 className="font-bold text-sm text-zinc-900 font-sans">{settings.shopName}</h2>
                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">مواتير ومحركات سيارات</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {settings.phone1} {settings.phone2 ? `• ${settings.phone2}` : ''}
                </p>
              </div>

              <div className="text-right text-[11px] space-y-1 border-b border-dashed border-zinc-300 pb-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">رقم الفاتورة:</span>
                  <span className="font-bold">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">التاريخ:</span>
                  <span>{invoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">العميل:</span>
                  <span className="font-sans font-semibold">{invoice.customerName}</span>
                </div>
                {invoice.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-sans">الهاتف:</span>
                    <span>{invoice.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Item Details */}
              <div className="text-right text-[11px] border-b border-dashed border-zinc-300 pb-2 space-y-1.5">
                <div className="font-sans font-bold text-zinc-900">{invoice.engineTitle}</div>
                <div className="flex justify-between text-zinc-600">
                  <span className="font-sans">رقم المحرك:</span>
                  <span className="font-bold text-zinc-900">{invoice.engineNumber}</span>
                </div>
                {invoice.chassisNumber && (
                  <div className="flex justify-between text-zinc-600">
                    <span className="font-sans">الشاسيه:</span>
                    <span>{invoice.chassisNumber}</span>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="text-right text-[11px] space-y-1 border-b border-dashed border-zinc-300 pb-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">الإجمالي:</span>
                  <span>{invoice.totalAmount.toLocaleString('en-US')} ج.م</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span className="font-sans">الخصم:</span>
                    <span>-{invoice.discount.toLocaleString('en-US')} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-zinc-900 text-xs pt-1 border-t border-zinc-200">
                  <span className="font-sans">الصافي:</span>
                  <span>{invoice.finalAmount.toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span className="font-sans">المدفوع نقداً:</span>
                  <span>{invoice.paidAmount.toLocaleString('en-US')} ج.م</span>
                </div>
                {invoice.remainingAmount > 0 && (
                  <div className="flex justify-between font-bold text-amber-700">
                    <span className="font-sans">المتبقي آجل:</span>
                    <span>{invoice.remainingAmount.toLocaleString('en-US')} ج.م</span>
                  </div>
                )}
              </div>

              {/* Warranty Notice */}
              <div className="text-[10px] text-zinc-600 font-sans leading-relaxed pt-1">
                <p className="font-semibold">{invoice.warrantyPeriod || settings.defaultWarranty}</p>
                <p className="text-zinc-400 mt-1">شكراً لتعاملكم معنا</p>
              </div>
            </div>
          ) : (
            /* A4 Official Format */
            <div id="printable-area" className="p-4 space-y-5 text-xs">
              <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-4">
                <div className="flex items-start gap-3">
                  <img src="/logo.png" alt="" className="w-12 h-12 object-contain" />
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">{settings.shopName}</h2>
                    <p className="text-zinc-500 text-[11px]">{settings.address}</p>
                    <p className="text-zinc-500 text-[11px] font-mono">
                      {settings.phone1} {settings.phone2 ? `• ${settings.phone2}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="font-bold text-sm text-zinc-900">فاتورة #{invoice.invoiceNumber}</div>
                  <div className="text-zinc-500 text-[11px] mt-0.5">{invoice.date}</div>
                </div>
              </div>

              {/* Customer & Engine Strip */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 block">بيانات العميل:</span>
                  <div className="font-bold text-zinc-900 mt-0.5">{invoice.customerName}</div>
                  {invoice.customerPhone && (
                    <div className="text-zinc-500 font-mono text-[11px]">{invoice.customerPhone}</div>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 block">بيانات السيارة:</span>
                  <div className="text-zinc-700 mt-0.5">
                    الشاسيه: <span className="font-mono font-semibold">{invoice.chassisNumber || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Engine Table */}
              <table className="w-full text-right border border-zinc-200 rounded-lg overflow-hidden">
                <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="py-2 px-3">البيان والموديل</th>
                    <th className="py-2 px-3">رقم المحرك المدموغ</th>
                    <th className="py-2 px-3 text-left">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-zinc-900">{invoice.engineTitle}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">{invoice.engineNumber}</td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-zinc-900">
                      {invoice.totalAmount.toLocaleString('en-US')} ج.م
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Financial Box */}
              <div className="flex justify-end">
                <div className="w-64 bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>الإجمالي:</span>
                    <span className="font-mono">{invoice.totalAmount.toLocaleString('en-US')} ج.م</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>الخصم:</span>
                      <span className="font-mono">-{invoice.discount.toLocaleString('en-US')} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-200 pt-1">
                    <span>الصافي:</span>
                    <span className="font-mono">{invoice.finalAmount.toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>المدفوع:</span>
                    <span className="font-mono">{invoice.paidAmount.toLocaleString('en-US')} ج.م</span>
                  </div>
                  {invoice.remainingAmount > 0 && (
                    <div className="flex justify-between font-bold text-amber-700 border-t border-zinc-200 pt-1">
                      <span>المتبقي آجل:</span>
                      <span className="font-mono">{invoice.remainingAmount.toLocaleString('en-US')} ج.م</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warranty */}
              <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/50 space-y-1 text-[11px] text-zinc-700">
                <div className="font-semibold text-zinc-900">شروط الضمان:</div>
                <p>{invoice.warrantyPeriod || settings.defaultWarranty}</p>
                <p className="text-zinc-500">{settings.invoiceNotice}</p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-200 text-center text-xs">
                <div>
                  <span className="text-zinc-500 block mb-6">توقيع المشتري</span>
                  <div className="border-b border-dashed border-zinc-300 w-36 mx-auto" />
                </div>
                <div>
                  <span className="text-zinc-500 block mb-6">توقيع وخاتم الإدارة</span>
                  <div className="border-b border-dashed border-zinc-300 w-36 mx-auto" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
