import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Engine, Customer, SalesInvoice, ShopSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  ShoppingCart,
  CheckCircle2,
  Trash2,
  UserPlus,
  Printer,
  FileCheck2,
  Car,
  AlertCircle,
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

  // Inventory & Customers
  const availableEngines = useLiveQuery(() => db.engines.where('status').equals('available').toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // POS State
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
  const [warranty, setWarranty] = useState('ضمان شهر تجربة شاملة');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Brands filter list
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

  const handleCheckout = async () => {
    if (!selectedEngine) {
      setError('يرجى اختيار مكنة أولاً لإتمام البيع');
      return;
    }
    if (finalAmount <= 0) {
      setError('السعر غير صالح');
      return;
    }

    let customerId = selectedCustomerId;
    let customerName = '';
    let customerPhone = '';

    if (isNewCustomer) {
      if (!newCustName.trim() || !newCustPhone.trim()) {
        setError('يرجى كتابة اسم ورقم هاتف العميل الجديد');
        return;
      }
      customerId = `cust-${Date.now()}`;
      customerName = newCustName.trim();
      customerPhone = newCustPhone.trim();

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
    } else {
      const existing = customers.find((c) => c.id === selectedCustomerId);
      if (!existing) {
        setError('يرجى اختيار العميل أو تسجيل عميل جديد');
        return;
      }
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

    setIsSubmitting(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const totalCost = selectedEngine.costPrice + selectedEngine.additionalCost;
      const profit = finalAmount - totalCost;
      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];

      const newInv: SalesInvoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber,
        customerId,
        customerName,
        customerPhone,
        engineId: selectedEngine.id,
        engineNumber: selectedEngine.engineNumber,
        engineTitle: `${selectedEngine.carBrand} ${selectedEngine.carModel}`,
        costPrice: totalCost,
        totalAmount: sellingPrice,
        discount,
        finalAmount,
        paidAmount,
        remainingAmount,
        paymentType,
        warrantyPeriod: warranty,
        chassisNumber: chassisNumber.trim(),
        date: todayDate,
        profit,
        createdBy: currentAccount?.name || 'مسؤول المبيعات',
        createdAt: now,
      };

      await db.salesInvoices.add(newInv);

      await db.engines.update(selectedEngine.id, {
        status: 'sold',
        actualSoldPrice: finalAmount,
        customerId,
        customerName,
        saleInvoiceId: newInv.id,
        saleDate: todayDate,
        warrantyPeriod: warranty,
        updatedAt: now,
      });

      if (paidAmount > 0) {
        await db.transactions.add({
          id: `tx-${Date.now()}`,
          type: 'income',
          category: 'sale',
          categoryLabel: paymentType === 'cash' ? 'تحصيل كاش' : 'دفعة مقدمة',
          amount: paidAmount,
          title: `مبيعات مكنة ${selectedEngine.engineNumber} (فاتورة ${invoiceNumber})`,
          date: todayDate,
          relatedId: newInv.id,
          createdBy: currentAccount?.name || 'الكاشير',
          createdAt: now,
        });
      }

      // Reset selection and trigger print modal
      setSelectedEngine(null);
      setIsSubmitting(false);
      onInvoiceCreated(newInv);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الفاتورة');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* LEFT: Engine Catalog / Available Stock (8 cols on wide) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Search & Brands Strip */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute right-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث برقم المكنة المدموغ (G4FC...) أو الموديل (إلنترا، سيراتو...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBrand(b)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedBrand === b
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Engine Grid - 3 cols on xl desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[720px] overflow-y-auto pr-1">
          {filteredEngines.map((eng) => {
            const isSelected = selectedEngine?.id === eng.id;

            return (
              <div
                key={eng.id}
                onClick={() => handleSelectEngine(eng)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                  isSelected
                    ? 'border-slate-900 ring-2 ring-slate-900 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block">{eng.carBrand}</span>
                    <h4 className="font-bold text-slate-900 text-sm">{eng.carModel}</h4>
                  </div>
                  <span className="font-mono text-sm font-extrabold text-slate-900">
                    {eng.sellingPrice.toLocaleString('en-US')} ج.م
                  </span>
                </div>

                <div className="bg-slate-50 rounded-lg p-2 font-mono text-xs text-slate-800 font-bold flex items-center justify-between border border-slate-100">
                  <span>{eng.engineNumber}</span>
                  {eng.hasClearanceDoc && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-semibold">
                      ورق إفراج جاهز
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{eng.modelYear || 'موديل قياسي'}</span>
                  <span className="text-slate-700 font-medium">{eng.transmissionType}</span>
                </div>
              </div>
            );
          })}

          {filteredEngines.length === 0 && (
            <div className="col-span-2 p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              لا توجد مواتير متاحة تطابق البحث
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Register / Checkout Panel (4 cols on wide) */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 sticky top-24">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-slate-800" />
            <h3 className="font-bold text-lg text-slate-900">شاشة البيع (كاشير)</h3>
          </div>
          {selectedEngine && (
            <button
              onClick={() => setSelectedEngine(null)}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>إلغاء المكنة</span>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Selected Engine Display */}
        {selectedEngine ? (
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-amber-400 font-bold block">{selectedEngine.carBrand}</span>
                <h4 className="font-bold text-base text-white">{selectedEngine.carModel}</h4>
              </div>
              <span className="font-mono text-base font-extrabold text-amber-400">
                {selectedEngine.sellingPrice.toLocaleString('en-US')} ج.م
              </span>
            </div>
            <div className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded select-all">
              كود المحرك: {selectedEngine.engineNumber}
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
            اختر مكنة من القائمة على اليمين لبدء الفاتورة
          </div>
        )}

        {/* Customer Select */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-700">العميل والمشتري</label>
            <button
              type="button"
              onClick={() => setIsNewCustomer(!isNewCustomer)}
              className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
            >
              {isNewCustomer ? 'اختيار مسجل' : '+ عميل جديد'}
            </button>
          </div>

          {isNewCustomer ? (
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <input
                type="text"
                placeholder="اسم العميل..."
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="tel"
                placeholder="رقم الهاتف..."
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          ) : (
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="">-- اختر العميل --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) {c.balance > 0 ? `[عليه ${c.balance.toLocaleString('en-US')} ج.م]` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Payment Type Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">طريقة الدفع</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handlePaymentType('cash')}
              className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                paymentType === 'cash' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              كاش كامل
            </button>
            <button
              type="button"
              onClick={() => handlePaymentType('partial')}
              className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                paymentType === 'partial' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              مقدم + آجل
            </button>
            <button
              type="button"
              onClick={() => handlePaymentType('credit')}
              className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                paymentType === 'credit' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              آجل بالكامل
            </button>
          </div>
        </div>

        {/* Financial Inputs */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-600 block mb-1 font-semibold">سعر البيع</label>
            <input
              type="number"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="text-slate-600 block mb-1 font-semibold">الخصم</label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
            />
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>الصافي المطلوب:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {finalAmount.toLocaleString('en-US')} ج.م
            </span>
          </div>
          <div className="flex justify-between items-center text-emerald-800">
            <span className="font-semibold">المسدد نقداً (وارد الخزينة):</span>
            <input
              type="number"
              min="0"
              max={finalAmount}
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 text-left"
            />
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-amber-900">
            <span>المتبقي آجل على العميل:</span>
            <span className="font-mono text-sm">
              {remainingAmount.toLocaleString('en-US')} ج.م
            </span>
          </div>
        </div>

        {/* Big Action Button */}
        <button
          type="button"
          disabled={!selectedEngine || isSubmitting}
          onClick={handleCheckout}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>{isSubmitting ? 'جارٍ الحفظ...' : 'إتمام الفاتورة وطباعتها فوراً'}</span>
        </button>
      </div>
    </div>
  );
};
