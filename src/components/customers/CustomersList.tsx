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
  Edit2,
  Trash2,
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

  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  const customers = useLiveQuery(() => db.customers.reverse().sortBy('createdAt')) || [];

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    const matchesDebt = !filterDebtOnly || c.balance > 0;
    return matchesSearch && matchesDebt;
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + c.balance, 0);
  const debtCount = customers.filter((c) => c.balance > 0).length;

  const openAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setFormError('');
    setIsAddCustomerOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address || '');
    setFormError('');
    setIsAddCustomerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setFormError('الاسم ورقم الهاتف مطلوبين');
      return;
    }

    const now = new Date().toISOString();
    if (editingCustomer) {
      await db.customers.update(editingCustomer.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        updatedAt: now,
      });
    } else {
      await db.customers.add({
        id: `cust-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        totalPurchases: 0,
        totalPaid: 0,
        balance: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    setIsAddCustomerOpen(false);
  };

  const handleDelete = async (c: Customer) => {
    if (c.balance > 0) {
      alert(`لا يمكن حذف العميل لأن عليه آجل متبقي (${c.balance.toLocaleString('en-US')} ج.م)`);
      return;
    }
    if (window.confirm(`حذف العميل "${c.name}"؟`)) {
      await db.customers.delete(c.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">سجل العملاء والآجل</h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {customers.length} عميل
            </span>
          </div>
          <span className="text-xs text-slate-400">إجمالي الآجل بالخارج: {totalOutstanding.toLocaleString('en-US')} ج.م</span>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <UserPlus className="w-4 h-4 text-amber-400" />
          <span>تسجيل عميل جديد</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم العميل أو رقم التليفون..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setFilterDebtOnly(!filterDebtOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
            filterDebtOnly ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {filterDebtOnly ? 'عرض الكل' : `عليهم آجل فقط (${debtCount})`}
        </button>
      </div>

      {/* Table of Customers */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">اسم العميل</th>
                <th className="py-3 px-4">رقم الهاتف</th>
                <th className="py-3 px-4 text-left">إجمالي المشتريات</th>
                <th className="py-3 px-4 text-left">إجمالي المسدد</th>
                <th className="py-3 px-4 text-left">الآجل المتبقي</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const hasDebt = c.balance > 0;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3.5 px-4 text-left font-mono font-semibold text-slate-800">
                      {c.totalPurchases.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-semibold text-emerald-700">
                      {c.totalPaid.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-bold">
                      {hasDebt ? (
                        <span className="text-amber-700">{c.balance.toLocaleString('en-US')} ج.م</span>
                      ) : (
                        <span className="text-slate-400 font-normal">خالص</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {hasDebt && (
                          <button
                            type="button"
                            onClick={() => setPayingCustomer(c)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            تحصيل دفعة
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setStatementCustomer(c)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          كشف حساب
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    لا يوجد عملاء يطابقون البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payingCustomer && (
        <CustomerPaymentModal
          customer={payingCustomer}
          onClose={() => setPayingCustomer(null)}
          onPaymentSaved={() => {}}
        />
      )}

      {statementCustomer && (
        <CustomerStatementModal
          customer={statementCustomer}
          settings={settings}
          onClose={() => setStatementCustomer(null)}
        />
      )}

      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingCustomer ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد'}
              </h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              {formError && <div className="text-rose-600 text-xs font-bold">{formError}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان / الورشة</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl cursor-pointer"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
