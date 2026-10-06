import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Engine, Customer, SalesInvoice, ShopSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, AlertCircle } from 'lucide-react';

interface CreateSaleModalProps {
  initialEngine?: Engine | null;
  isOpen: boolean;
  settings: ShopSettings;
  onClose: () => void;
  onSaleCreated: (invoice: SalesInvoice) => void;
}

export const CreateSaleModal: React.FC<CreateSaleModalProps> = ({
  initialEngine,
  isOpen,
  settings,
  onClose,
  onSaleCreated,
}) => {
  const { currentAccount } = useAuth();
  const [availableEngines, setAvailableEngines] = useState<Engine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedEngineId, setSelectedEngineId] = useState<string>('');

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'partial' | 'credit'>('cash');
  const [chassisNumber, setChassisNumber] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      db.engines.where('status').equals('available').toArray().then((list) => {
        setAvailableEngines(list);
      });
      db.customers.toArray().then((list) => {
        setCustomers(list);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialEngine) {
      setSelectedEngineId(initialEngine.id);
      setSellingPrice(initialEngine.sellingPrice);
      setPaidAmount(initialEngine.sellingPrice);
      setPaymentType('cash');
    } else if (availableEngines.length > 0 && !selectedEngineId) {
      const first = availableEngines[0];
      setSelectedEngineId(first.id);
      setSellingPrice(first.sellingPrice);
      setPaidAmount(first.sellingPrice);
      setPaymentType('cash');
    }
  }, [initialEngine, availableEngines]);

  if (!isOpen) return null;

  const currentEngine =
    availableEngines.find((e) => e.id === selectedEngineId) || initialEngine;

  const handleEngineChange = (engineId: string) => {
    setSelectedEngineId(engineId);
    const eng = availableEngines.find((e) => e.id === engineId);
    if (eng) {
      setSellingPrice(eng.sellingPrice);
      setDiscount(0);
      setPaidAmount(eng.sellingPrice);
    }
  };

  const finalAmount = Math.max(0, sellingPrice - discount);
  const remainingAmount = Math.max(0, finalAmount - paidAmount);

  const handlePaymentTypeChange = (type: 'cash' | 'partial' | 'credit') => {
    setPaymentType(type);
    if (type === 'cash') setPaidAmount(finalAmount);
    else if (type === 'credit') setPaidAmount(0);
    else setPaidAmount(Math.round(finalAmount / 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentEngine) {
      setError('اختر محركاً للبيع');
      return;
    }

    if (sellingPrice <= 0) {
      setError('سعر البيع يجب أن يكون أكبر من صفر');
      return;
    }

    let customerId = selectedCustomerId;
    let customerName = 'عميل نقدي';
    let customerPhone = '';

    // Strict validation: cannot sell on credit without a registered customer or new customer
    if (remainingAmount > 0 || paymentType === 'credit' || paymentType === 'partial') {
      if (!isNewCustomer && !selectedCustomerId) {
        setError('لا يمكن إصدار فاتورة على الأجل دون ربطها بعميل مسجل! يرجى اختيار عميل أو تسجيل عميل جديد.');
        return;
      }
      if (isNewCustomer && !newCustomerName.trim()) {
        setError('يرجى إدخال اسم العميل لتسجيل المديونية الآجلة في حسابه');
        return;
      }
    }

    if (isNewCustomer && newCustomerName.trim()) {
      customerId = `cust-${Date.now()}`;
      customerName = newCustomerName.trim();
      customerPhone = newCustomerPhone.trim();

      await db.customers.add({
        id: customerId,
        name: customerName,
        phone: customerPhone,
        totalPurchases: finalAmount,
        totalPaid: paidAmount,
        balance: remainingAmount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (selectedCustomerId) {
      const existing = customers.find((c) => c.id === selectedCustomerId);
      if (existing) {
        customerId = existing.id;
        customerName = existing.name;
        customerPhone = existing.phone;

        await db.customers.update(customerId, {
          totalPurchases: existing.totalPurchases + finalAmount,
          totalPaid: existing.totalPaid + paidAmount,
          balance: existing.balance + remainingAmount,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    setIsSubmitting(true);

    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const totalCost = currentEngine.costPrice + currentEngine.additionalCost;
      const profit = finalAmount - totalCost;
      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];

      const newInvoice: SalesInvoice = {
        id: `sale-${Date.now()}`,
        invoiceNumber,
        customerId: customerId || 'cash-customer',
        customerName,
        customerPhone,
        engineId: currentEngine.id,
        engineNumber: currentEngine.engineNumber,
        engineTitle: `${currentEngine.carBrand} ${currentEngine.carModel}`,
        costPrice: totalCost,
        totalAmount: sellingPrice,
        discount,
        finalAmount,
        paidAmount,
        remainingAmount,
        paymentType,
        warrantyPeriod: settings.defaultWarranty,
        chassisNumber: chassisNumber.trim(),
        date: todayDate,
        profit,
        status: 'active',
        createdBy: currentAccount?.name || 'كاشير',
        createdAt: now,
      };

      await db.salesInvoices.add(newInvoice);

      await db.engines.update(currentEngine.id, {
        status: 'sold',
        actualSoldPrice: finalAmount,
        customerId: customerId || 'cash-customer',
        customerName,
        saleInvoiceId: newInvoice.id,
        saleDate: todayDate,
        updatedAt: now,
      });

      if (paidAmount > 0) {
        await db.transactions.add({
          id: `tx-${Date.now()}`,
          type: 'income',
          category: 'sale',
          categoryLabel: paymentType === 'cash' ? 'مبيعات كاش' : 'دفعة مبيعات',
          amount: paidAmount,
          title: `مبيعات محرك ${currentEngine.engineNumber} (فاتورة ${invoiceNumber})`,
          date: todayDate,
          relatedId: newInvoice.id,
          createdBy: currentAccount?.name || 'كاشير',
          createdAt: now,
        });
      }

      setIsSubmitting(false);
      onSaleCreated(newInvoice);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ الفاتورة';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">إنشاء فاتورة بيع</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1 text-xs">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Engine Select */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">المحرك المطلوب *</label>
            <select
              value={selectedEngineId}
              onChange={(e) => handleEngineChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-900"
            >
              {availableEngines.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.carBrand} {eng.carModel} • [{eng.engineNumber}] • {eng.sellingPrice.toLocaleString('en-US')} ج.م
                </option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-700 flex items-center gap-1">
                <span>بيانات العميل</span>
                {(remainingAmount > 0 || paymentType !== 'cash') && (
                  <span className="text-[10px] text-rose-600 font-bold">* إلزامي للآجل</span>
                )}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsNewCustomer(!isNewCustomer);
                  setSelectedCustomerId('');
                  setNewCustomerName('');
                  setNewCustomerPhone('');
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                {isNewCustomer ? '← اختيار مسجل' : '+ تسجيل عميل جديد'}
              </button>
            </div>

            {isNewCustomer ? (
              <div className="space-y-1.5 p-2 bg-blue-50/50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-blue-700 font-medium block">تسجيل عميل جديد وحفظ الفاتورة باسمه:</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="اسم العميل الرباعي..."
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="رقم الهاتف..."
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className={`w-full px-2.5 py-1.5 bg-zinc-50 border rounded-lg text-xs text-zinc-900 ${
                  (remainingAmount > 0 || paymentType !== 'cash') && !selectedCustomerId
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-zinc-200'
                }`}
              >
                <option value="">
                  {paymentType === 'cash' && remainingAmount === 0
                    ? 'عميل نقدي (بدون حساب)'
                    : '-- اختر عميلاً مسجلاً لتسجيل الآجل --'}
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.balance > 0 ? `[عليه مديونية: ${c.balance.toLocaleString('en-US')} ج.م]` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Payment Type */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-200">
            <label className="font-semibold text-zinc-700 block">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('cash')}
                className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  paymentType === 'cash' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                كاش كامل
              </button>
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('partial')}
                className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  paymentType === 'partial' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                مقدم + آجل
              </button>
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('credit')}
                className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  paymentType === 'credit' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                آجل بالكامل
              </button>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">سعر البيع</label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">الخصم</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">المدفوع نقداً</label>
              <input
                type="number"
                min="0"
                max={finalAmount}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg font-mono font-bold text-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 block mb-1">رقم الشاسيه (اختياري)</label>
            <input
              type="text"
              placeholder="شاسيه السيارة المراد تركيب المكنة عليها..."
              value={chassisNumber}
              onChange={(e) => setChassisNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg font-mono"
            />
          </div>

          {/* Summary Box */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-600">الصافي:</span>
              <span className="font-mono font-bold text-zinc-900">{finalAmount.toLocaleString('en-US')} ج.م</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between font-bold text-amber-700 border-t border-zinc-200 pt-1">
                <span>المتبقي آجل:</span>
                <span className="font-mono">{remainingAmount.toLocaleString('en-US')} ج.م</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'جارٍ الحفظ...' : 'إتمام الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
