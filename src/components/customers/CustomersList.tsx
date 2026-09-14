import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Customer, ShopSettings } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  HandCoins,
  FileText,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { CustomerPaymentModal } from './CustomerPaymentModal';
import { CustomerStatementModal } from './CustomerStatementModal';

interface CustomersListProps {
  settings: ShopSettings;
}

export const CustomersList: React.FC<CustomersListProps> = ({ settings }) => {
  const [search, setSearch] = useState('');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);

  // Modals state
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form state for Add/Edit
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const customers = useLiveQuery(() => db.customers.reverse().sortBy('createdAt')) || [];

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.nationalId && c.nationalId.includes(q));

    const matchesDebt = !filterDebtOnly || c.balance > 0;
    return matchesSearch && matchesDebt;
  });

  const totalOutstandingCredit = customers.reduce((sum, c) => sum + c.balance, 0);
  const customersWithDebtCount = customers.filter((c) => c.balance > 0).length;

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setNationalId('');
    setAddress('');
    setNotes('');
    setFormError('');
    setIsAddCustomerOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setNationalId(c.nationalId || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setFormError('');
    setIsAddCustomerOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('اسم العميل مطلوب');
      return;
    }
    if (!phone.trim()) {
      setFormError('رقم التليفون مطلوب');
      return;
    }

    const now = new Date().toISOString();
    if (editingCustomer) {
      await db.customers.update(editingCustomer.id, {
        name: name.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        address: address.trim(),
        notes: notes.trim(),
        updatedAt: now,
      });
    } else {
      await db.customers.add({
        id: `cust-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        address: address.trim(),
        totalPurchases: 0,
        totalPaid: 0,
        balance: 0,
        notes: notes.trim(),
        createdAt: now,
        updatedAt: now,
      });
    }
    setIsAddCustomerOpen(false);
  };

  const handleDeleteCustomer = async (c: Customer) => {
    if (c.balance > 0) {
      alert(`لا يمكن حذف العميل لأن بذمته آجل متبقي بقيمة (${c.balance.toLocaleString('ar-EG')} ج.م)`);
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف العميل "${c.name}"؟`)) {
      await db.customers.delete(c.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                سجل العملاء وحسابات الآجل
              </h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {customers.length} عميل مسجل
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              متابعة مديونيات العملاء، أقساط المواتير، وسندات القبض النقدية
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>تسجيل عميل جديد</span>
          </button>
        </div>

        {/* Highlight cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-amber-900 block">إجمالي الآجل بالخارج (فلوس بره)</span>
            <span className="text-xl font-bold text-amber-950 font-mono">
              {totalOutstandingCredit.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-slate-600 block">عدد العملاء المدينين بآجل</span>
            <span className="text-xl font-bold text-slate-900">
              {customersWithDebtCount} عميل
            </span>
          </div>
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-emerald-900 block">عملاء خالصين بالكامل</span>
            <span className="text-xl font-bold text-emerald-950">
              {customers.length - customersWithDebtCount} عميل
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم العميل، رقم التليفون، الرقم القومي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setFilterDebtOnly(!filterDebtOnly)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            filterDebtOnly
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {filterDebtOnly ? 'عرض كل العملاء' : 'عرض من عليهم آجل فقط ⚠'}
        </button>
      </div>

      {/* Customers Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-sm">
          لا يوجد عملاء يطابقون شروط البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const hasDebt = cust.balance > 0;

            return (
              <div
                key={cust.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top line */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {cust.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {cust.phone}
                        </span>
                      </div>
                    </div>

                    {hasDebt ? (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        عليه آجل
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        خالص الحساب
                      </span>
                    )}
                  </div>

                  {/* Address & Note */}
                  {cust.address && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}

                  {/* Financial Balance Strip */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">إجمالي المشتريات:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {cust.totalPurchases.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">إجمالي المسدد:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {cust.totalPaid.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                      <span className="text-slate-900">الآجل المتبقي:</span>
                      <span className={`font-mono text-sm ${hasDebt ? 'text-amber-800 font-extrabold' : 'text-slate-600'}`}>
                        {cust.balance.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action buttons */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {hasDebt ? (
                      <button
                        type="button"
                        onClick={() => setPayingCustomer(cust)}
                        className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        <HandCoins className="w-3.5 h-3.5" />
                        <span>تحصيل دفعة</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="bg-slate-100 text-slate-400 text-xs font-semibold py-2 rounded-xl cursor-not-allowed text-center"
                      >
                        لا يوجد متبقي
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setStatementCustomer(cust)}
                      className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>كشف حساب</span>
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(cust)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                      title="تعديل بيانات العميل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(cust)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="حذف العميل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Collect Payment Modal */}
      {payingCustomer && (
        <CustomerPaymentModal
          customer={payingCustomer}
          onClose={() => setPayingCustomer(null)}
          onPaymentSaved={() => {
            // Updated
          }}
        />
      )}

      {/* Customer Statement Modal */}
      {statementCustomer && (
        <CustomerStatementModal
          customer={statementCustomer}
          settings={settings}
          onClose={() => setStatementCustomer(null)}
        />
      )}

      {/* Add / Edit Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingCustomer ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد'}
              </h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3.5">
              {formError && (
                <div className="bg-rose-50 text-rose-800 text-xs p-2.5 rounded-lg border border-rose-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الأسطى شريف ميكانيكي"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم التليفون *</label>
                <input
                  type="tel"
                  required
                  placeholder="010XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرقم القومي (اختياري للضمان)</label>
                <input
                  type="text"
                  placeholder="14 رقم"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان / الورشة</label>
                <input
                  type="text"
                  placeholder="المحافظة - المنطقة"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCustomer ? 'حفظ التعديل' : 'إضافة العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
