import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Engine, Customer, SalesInvoice, ShopSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  ShoppingCart,
  UserPlus,
  AlertCircle,
  Car,
  FileCheck2,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

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
  
  // Customer selection or new customer
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerNationalId, setNewCustomerNationalId] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');

  // Financial inputs
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'partial' | 'credit'>('cash');
  const [warrantyPeriod, setWarrantyPeriod] = useState(settings.defaultWarranty);
  const [chassisNumber, setChassisNumber] = useState('');
  const [notes, setNotes] = useState('');

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
    if (type === 'cash') {
      setPaidAmount(finalAmount);
    } else if (type === 'credit') {
      setPaidAmount(0);
    } else {
      setPaidAmount(Math.round(finalAmount / 2)); // default half down payment
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentEngine) {
      setError('يرجى اختيار مكنة للبيع من القائمة');
      return;
    }

    if (sellingPrice <= 0) {
      setError('سعر البيع يجب أن يكون أكبر من صفر');
      return;
    }

    let customerId = selectedCustomerId;
    let customerName = '';
    let customerPhone = '';

    if (isNewCustomer) {
      if (!newCustomerName.trim()) {
        setError('اسم العميل الجديد مطلوب');
        return;
      }
      if (!newCustomerPhone.trim()) {
        setError('رقم هاتف العميل مطلوب');
        return;
      }

      customerId = `cust-${Date.now()}`;
      customerName = newCustomerName.trim();
      customerPhone = newCustomerPhone.trim();

      const newCust: Customer = {
        id: customerId,
        name: customerName,
        phone: customerPhone,
        nationalId: newCustomerNationalId.trim(),
        address: newCustomerAddress.trim(),
        totalPurchases: finalAmount,
        totalPaid: paidAmount,
        balance: remainingAmount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.customers.add(newCust);
    } else {
      const existing = customers.find((c) => c.id === selectedCustomerId);
      if (!existing) {
        setError('يرجى اختيار العميل من القائمة أو تسجيل عميل جديد');
        return;
      }
      customerId = existing.id;
      customerName = existing.name;
      customerPhone = existing.phone;

      // Update existing customer totals
      await db.customers.update(customerId, {
        totalPurchases: existing.totalPurchases + finalAmount,
        totalPaid: existing.totalPaid + paidAmount,
        balance: existing.balance + remainingAmount,
        updatedAt: new Date().toISOString(),
      });
    }

    setIsSubmitting(true);

    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const totalCost = currentEngine.costPrice + currentEngine.additionalCost;
      const profit = finalAmount - totalCost;
      const now = new Date().toISOString();
      const todayDate = new Date().toISOString().split('T')[0];

      const newInvoice: SalesInvoice = {
        id: `sale-${Date.now()}`,
        invoiceNumber,
        customerId,
        customerName,
        customerPhone,
        engineId: currentEngine.id,
        engineNumber: currentEngine.engineNumber,
        engineTitle: `${currentEngine.carBrand} - ${currentEngine.carModel} (${currentEngine.engineCapacity})`,
        costPrice: totalCost,
        totalAmount: sellingPrice,
        discount,
        finalAmount,
        paidAmount,
        remainingAmount,
        paymentType,
        warrantyPeriod,
        chassisNumber: chassisNumber.trim(),
        date: todayDate,
        profit,
        notes: notes.trim(),
        createdBy: currentAccount?.name || 'مسؤول المبيعات',
        createdAt: now,
      };

      // 1. Add Sales Invoice
      await db.salesInvoices.add(newInvoice);

      // 2. Mark Engine as SOLD
      await db.engines.update(currentEngine.id, {
        status: 'sold',
        actualSoldPrice: finalAmount,
        customerId,
        customerName,
        saleInvoiceId: newInvoice.id,
        saleDate: todayDate,
        warrantyPeriod,
        updatedAt: now,
      });

      // 3. If cash paid > 0, record in Treasury transactions
      if (paidAmount > 0) {
        await db.transactions.add({
          id: `tx-${Date.now()}`,
          type: 'income',
          category: 'sale',
          categoryLabel: paymentType === 'cash' ? 'تحصيل بيع مكنة نقداً' : 'مقدم بيع مكنة (آجل)',
          amount: paidAmount,
          title: `مبيعات مكنة ${currentEngine.engineNumber} - فاتورة ${invoiceNumber}`,
          notes: `عميل: ${customerName} | المسدد: ${paidAmount.toLocaleString('ar-EG')} ج.م`,
          date: todayDate,
          relatedId: newInvoice.id,
          createdBy: currentAccount?.name || 'مسؤول المبيعات',
          createdAt: now,
        });
      }

      onSaleCreated(newInvoice);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ فاتورة البيع';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                إنشاء فاتورة بيع مكنة سيارة
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تنزيل المكنة من المخزن وإثبات الحساب نقدي أو آجل
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Engine Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المكنة المراد بيعها من المخزن *
            </label>
            <select
              value={selectedEngineId}
              onChange={(e) => handleEngineChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none"
            >
              {availableEngines.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.carBrand} {eng.carModel} • رقم المكنة: [{eng.engineNumber}] • السعر: {eng.sellingPrice.toLocaleString('ar-EG')} ج.م
                </option>
              ))}
            </select>

            {currentEngine && (
              <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500">رقم المحرك المدموغ:</span>{' '}
                  <strong className="font-mono text-slate-900 font-bold select-all bg-white px-2 py-0.5 rounded border border-slate-200">
                    {currentEngine.engineNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">التكلفة الإجمالية:</span>{' '}
                  <strong className="text-slate-800">
                    {(currentEngine.costPrice + currentEngine.additionalCost).toLocaleString('ar-EG')} ج.م
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">ورق الإفراج:</span>{' '}
                  <strong className={currentEngine.hasClearanceDoc ? 'text-emerald-700' : 'text-amber-700'}>
                    {currentEngine.hasClearanceDoc ? 'مرفوع وجاهز' : 'غير مرفوع'}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* 2. Customer Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">بيانات العميل والمشتري *</label>
              <button
                type="button"
                onClick={() => setIsNewCustomer(!isNewCustomer)}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isNewCustomer ? 'اختيار عميل مسجل سابقاً' : '+ تسجيل عميل جديد الآن'}</span>
              </button>
            </div>

            {isNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 border border-blue-200 p-3.5 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الأسطى شريف ميكانيكي"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم التليفون *</label>
                  <input
                    type="tel"
                    required
                    placeholder="010XXXXXXXX"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الرقم القومي (اختياري)</label>
                  <input
                    type="text"
                    placeholder="14 رقم للضمان"
                    value={newCustomerNationalId}
                    onChange={(e) => setNewCustomerNationalId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">العنوان / الورشة</label>
                  <input
                    type="text"
                    placeholder="المحافظة - المنطقة"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="">-- اختر العميل من القائمة --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) {c.balance > 0 ? `[عليه آجل: ${c.balance.toLocaleString('ar-EG')} ج.م]` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Pricing & Payment System (Cash vs Credit) */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              الحساب وطريقة الدفع (كاش أو آجل)
            </h4>

            {/* Payment Type Toggle */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('cash')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentType === 'cash'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                سداد نقدي كامل (كاش)
              </button>
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('partial')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentType === 'partial'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                دفع مقدم + متبقي آجل
              </button>
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('credit')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentType === 'credit'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                آجل بالكامل (بدون مقدم)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سعر البيع المتفق عليه *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  خصم للعميل (إن وجد)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المدفوع نقداً الآن (وارد الخزينة) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={finalAmount}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-emerald-700 focus:bg-white"
                />
              </div>
            </div>

            {/* Calculations Review Card */}
            <div className="mt-3 bg-slate-900 text-white rounded-xl p-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">الصافي المطلوب</span>
                <span className="font-mono text-base font-bold text-white">
                  {finalAmount.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="border-r border-l border-slate-800">
                <span className="text-slate-400 block text-[11px]">المقبوض الآن في الخزنة</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {paidAmount.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الآجل المتبقي على العميل</span>
                <span className="font-mono text-base font-bold text-amber-400">
                  {remainingAmount.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* 4. Warranty & Chassis */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                فترة الضمان والتجربة
              </label>
              <input
                type="text"
                value={warrantyPeriod}
                onChange={(e) => setWarrantyPeriod(e.target.value)}
                placeholder="مثال: شهر ضمان تجربة كاملة"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم شاسيه السيارة (اختياري لتوثيق الضمان)
              </label>
              <input
                type="text"
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                placeholder="مثال: KMHD..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? 'جارٍ إصدار الفاتورة...' : 'إتمام البيع وطباعة الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
