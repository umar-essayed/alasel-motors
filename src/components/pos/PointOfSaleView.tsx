import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Engine, SalesInvoice, ShopSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  ShoppingCart,
  Trash2,
  Printer,
  FileCheck2,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface PointOfSaleViewProps {
  settings: ShopSettings;
  onInvoiceCreated: (invoice: SalesInvoice) => void;
}

export const PointOfSaleView: React.FC<PointOfSaleViewProps> = ({
  settings,
  onInvoiceCreated,
}) => {
  const { currentAccount } = useAuth();

  const availableEngines = useLiveQuery(() => db.engines.where('status').equals('available').toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('الكل');
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Pricing State
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'partial' | 'credit'>('cash');
  const [chassisNumber, setChassisNumber] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const brands = ['الكل', 'هيونداي', 'كيا', 'تويوتا', 'نيسان', 'ميتسوبيشي', 'شيفروليه'];

  const filteredEngines = availableEngines.filter((eng) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      eng.engineNumber.toLowerCase().includes(q) ||
      eng.carBrand.toLowerCase().includes(q) ||
      eng.carModel.toLowerCase().includes(q);

    const matchBrand = selectedBrand === 'الكل' || eng.carBrand.includes(selectedBrand);
    return matchSearch && matchBrand;
  });

  const handleSelectEngine = (eng: Engine) => {
    setSelectedEngine(eng);
    setSellingPrice(eng.sellingPrice);
    setDiscount(0);
    setPaidAmount(eng.sellingPrice);
    setPaymentType('cash');
    setError('');
  };

  const finalAmount = Math.max(0, sellingPrice - discount);
  const remainingAmount = Math.max(0, finalAmount - paidAmount);

  const handlePaymentType = (type: 'cash' | 'partial' | 'credit') => {
    setPaymentType(type);
    if (type === 'cash') setPaidAmount(finalAmount);
    else if (type === 'credit') setPaidAmount(0);
    else setPaidAmount(Math.round(finalAmount / 2));
  };

  const resetCart = () => {
    setSelectedEngine(null);
    setSelectedCustomerId('');
    setIsNewCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setSellingPrice(0);
    setDiscount(0);
    setPaidAmount(0);
    setPaymentType('cash');
    setChassisNumber('');
    setError('');
  };

  const handleCheckout = async (forceFullCash = false) => {
    if (!selectedEngine) {
      setError('اختر محركاً أولاً لإتمام البيع');
      return;
    }
    if (finalAmount <= 0) {
      setError('إجمالي الفاتورة يجب أن يكون أكبر من صفر');
      return;
    }

    const effectivePaid = forceFullCash ? finalAmount : paidAmount;
    const effectiveRemaining = forceFullCash ? 0 : Math.max(0, finalAmount - effectivePaid);

    // Strict validation: cannot sell on credit without a registered customer or new customer
    if (effectiveRemaining > 0 || (!forceFullCash && (paymentType === 'credit' || paymentType === 'partial'))) {
      if (!isNewCustomer && !selectedCustomerId) {
        setError('لا يمكن إصدار فاتورة على الأجل دون ربطها بعميل مسجل! اختر عميلاً أو اضغط "+ عميل جديد".');
        return;
      }
      if (isNewCustomer && !newCustName.trim()) {
        setError('يرجى كتابة اسم العميل لتسجيل المديونية في حسابه');
        return;
      }
    }

    let customerId = selectedCustomerId;
    let customerName = 'عميل نقدي';
    let customerPhone = '';

    if (isNewCustomer && newCustName.trim()) {
      customerId = `cust-${Date.now()}`;
      customerName = newCustName.trim();
      customerPhone = newCustPhone.trim();

      await db.customers.add({
        id: customerId,
        name: customerName,
        phone: customerPhone,
        totalPurchases: finalAmount,
        totalPaid: effectivePaid,
        balance: effectiveRemaining,
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
          totalPaid: existing.totalPaid + effectivePaid,
          balance: existing.balance + effectiveRemaining,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    setIsSubmitting(true);
    try {
      const actualPaid = effectivePaid;
      const actualRemaining = effectiveRemaining;
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const totalCost = selectedEngine.costPrice + selectedEngine.additionalCost;
      const profit = finalAmount - totalCost;
      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];

      const newInv: SalesInvoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber,
        customerId: customerId || 'cash-customer',
        customerName,
        customerPhone,
        engineId: selectedEngine.id,
        engineNumber: selectedEngine.engineNumber,
        engineTitle: `${selectedEngine.carBrand} ${selectedEngine.carModel}`,
        costPrice: totalCost,
        totalAmount: sellingPrice,
        discount,
        finalAmount,
        paidAmount: actualPaid,
        remainingAmount: actualRemaining,
        paymentType: forceFullCash ? 'cash' : paymentType,
        warrantyPeriod: settings.defaultWarranty,
        chassisNumber: chassisNumber.trim(),
        date: todayDate,
        profit,
        status: 'active',
        createdBy: currentAccount?.name || 'كاشير',
        createdAt: now,
      };

      await db.salesInvoices.add(newInv);

      await db.engines.update(selectedEngine.id, {
        status: 'sold',
        actualSoldPrice: finalAmount,
        customerId: customerId || 'cash-customer',
        customerName,
        saleInvoiceId: newInv.id,
        saleDate: todayDate,
        updatedAt: now,
      });

      if (actualPaid > 0) {
        await db.transactions.add({
          id: `tx-${Date.now()}`,
          type: 'income',
          category: 'sale',
          categoryLabel: actualRemaining === 0 ? 'مبيعات كاش' : 'دفعة مبيعات',
          amount: actualPaid,
          title: `مبيعات محرك ${selectedEngine.engineNumber} (فاتورة ${invoiceNumber})`,
          date: todayDate,
          relatedId: newInv.id,
          createdBy: currentAccount?.name || 'كاشير',
          createdAt: now,
        });
      }

      resetCart();
      setIsSubmitting(false);
      onInvoiceCreated(newInv);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ الفاتورة';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">
      {/* LEFT: Inventory Catalog (8 cols) */}
      <div className="lg:col-span-8 space-y-3">
        {/* Search & Brands Strip */}
        <div className="bg-white border border-zinc-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              autoFocus
              placeholder="بحث برقم المحرك أو الموديل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto shrink-0 pb-1 sm:pb-0">
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBrand(b)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedBrand === b
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Engine Items List (High Density) */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
          {filteredEngines.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              لا توجد محركات متاحة مطابقة للبحث
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
              {filteredEngines.map((eng) => {
                const isSelected = selectedEngine?.id === eng.id;
                return (
                  <div
                    key={eng.id}
                    onClick={() => handleSelectEngine(eng)}
                    className={`p-3.5 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-100 border-r-4 border-zinc-900'
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-900 text-sm">
                            {eng.engineNumber}
                          </span>
                          {eng.hasClearanceDoc && (
                            <span className="text-[10px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <FileCheck2 className="w-3 h-3 text-zinc-500" />
                              <span>إفراج</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 block mt-0.5">
                          {eng.carBrand} {eng.carModel} {eng.modelYear ? `(${eng.modelYear})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="font-mono font-bold text-zinc-900 text-sm block">
                        {eng.sellingPrice.toLocaleString('en-US')} ج.م
                      </span>
                      <span className="text-[11px] text-zinc-400 block">
                        تكلفة: {(eng.costPrice + eng.additionalCost).toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Register / Checkout Panel (4 cols) */}
      <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl p-4 space-y-4 sticky top-20 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-zinc-700" />
            <h3 className="text-xs font-bold text-zinc-900">بيانات الفاتورة</h3>
          </div>
          {selectedEngine && (
            <button
              type="button"
              onClick={() => setSelectedEngine(null)}
              className="text-xs text-zinc-400 hover:text-rose-600 cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>إلغاء</span>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selected Engine Summary */}
        {selectedEngine ? (
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between font-mono font-bold text-zinc-900">
              <span>{selectedEngine.engineNumber}</span>
              <span>{selectedEngine.carBrand} {selectedEngine.carModel}</span>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200 rounded-lg p-4 text-center text-xs text-zinc-400">
            اضغط على أي محرك في القائمة لبدء البيع
          </div>
        )}

        {/* Customer Select */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
              <span>العميل</span>
              {(remainingAmount > 0 || paymentType !== 'cash') && (
                <span className="text-[10px] text-rose-600 font-bold">* إلزامي للآجل</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => {
                setIsNewCustomer(!isNewCustomer);
                setSelectedCustomerId('');
                setNewCustName('');
                setNewCustPhone('');
              }}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              {isNewCustomer ? '← اختيار عميل مسجل' : '+ تسجيل عميل جديد'}
            </button>
          </div>

          {isNewCustomer ? (
            <div className="space-y-1.5 p-2 bg-blue-50/50 border border-blue-200 rounded-lg">
              <span className="text-[10px] text-blue-700 font-medium block">تسجيل عميل جديد وحفظ الفاتورة باسمه:</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="اسم العميل الرباعي..."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium"
                />
                <input
                  type="tel"
                  placeholder="رقم الهاتف..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          ) : (
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className={`w-full px-2.5 py-1.5 bg-zinc-50 border rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none ${
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

        <div>
          <label className="text-zinc-600 block mb-1 text-[11px] font-medium">رقم شاسيه السيارة (اختياري)</label>
          <input
            type="text"
            placeholder="شاسيه السيارة..."
            value={chassisNumber}
            onChange={(e) => setChassisNumber(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono"
          />
        </div>

        {/* Pricing Inputs */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">سعر البيع</label>
            <input
              type="number"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
            />
          </div>
          <div>
            <label className="text-zinc-600 block mb-1 font-medium">الخصم</label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-zinc-900"
            />
          </div>
        </div>

        {/* Payment Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 block">نظام الدفع</label>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => handlePaymentType('cash')}
              className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                paymentType === 'cash' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              كاش كامل
            </button>
            <button
              type="button"
              onClick={() => handlePaymentType('partial')}
              className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                paymentType === 'partial' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              مقدم + آجل
            </button>
            <button
              type="button"
              onClick={() => handlePaymentType('credit')}
              className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                paymentType === 'credit' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              آجل بالكامل
            </button>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between text-zinc-600">
            <span>الصافي المطلوب:</span>
            <span className="font-mono font-bold text-zinc-900">
              {finalAmount.toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="flex justify-between items-center text-zinc-800">
            <span className="font-medium">المدفوع نقداً:</span>
            <input
              type="number"
              min="0"
              max={finalAmount}
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="w-24 px-2 py-1 bg-white border border-zinc-300 rounded font-mono font-bold text-zinc-900 text-left"
            />
          </div>

          {remainingAmount > 0 && (
            <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-semibold text-amber-700">
              <span>المتبقي آجل:</span>
              <span className="font-mono">{remainingAmount.toLocaleString('en-US')} ج.م</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Quick 1-Click Cash Checkout */}
          <button
            type="button"
            disabled={!selectedEngine || isSubmitting}
            onClick={() => handleCheckout(true)}
            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>كاش فوري (دفع كامل وطباعة)</span>
          </button>

          {/* Standard Checkout */}
          <button
            type="button"
            disabled={!selectedEngine || isSubmitting}
            onClick={() => handleCheckout(false)}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'جارٍ الحفظ...' : 'حفظ الفاتورة والطباعة'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
