import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Customer, ShopSettings } from '../../types';
import { exportToCsv } from '../../utils/exportUtils';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  X,
  Download,
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
    if (!name.trim()) {
      setFormError('اسم العميل مطلوب');
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
      alert(`لا يمكن حذف العميل لأن عليه متبقي (${c.balance.toLocaleString('en-US')} ج.م)`);
      return;
    }
    if (window.confirm(`تأكيد حذف العميل "${c.name}"؟`)) {
      await db.customers.delete(c.id);
    }
  };

  const handleExportCsv = () => {
    const headers = ['اسم العميل', 'رقم الهاتف', 'العنوان', 'إجمالي المشتريات', 'المسدد', 'المتبقي (الآجل)'];
    const rows = filtered.map((c) => [
      c.name,
      c.phone,
      c.address || '—',
      c.totalPurchases,
      c.totalPaid,
      c.balance,
    ]);
    exportToCsv('عملاء_الوكالة_موتورز', headers, rows);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-900">سجل العملاء والديون</h2>
            <span className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-semibold">
              {customers.length} عميل
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            إجمالي الآجل بالخارج: {totalOutstanding.toLocaleString('en-US')} ج.م
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-zinc-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير إكسيل</span>
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>تسجيل عميل</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-zinc-200 rounded-xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="بحث باسم العميل أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
          />
        </div>

        <button
          type="button"
          onClick={() => setFilterDebtOnly(!filterDebtOnly)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
            filterDebtOnly ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          {filterDebtOnly ? 'عرض الكل' : `عليهم آجل (${debtCount})`}
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">اسم العميل</th>
                <th className="py-2.5 px-4">رقم الهاتف</th>
                <th className="py-2.5 px-4 text-left">إجمالي المشتريات</th>
                <th className="py-2.5 px-4 text-left">المسدد</th>
                <th className="py-2.5 px-4 text-left">الآجل المتبقي</th>
                <th className="py-2.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((c) => {
                const hasDebt = c.balance > 0;

                return (
                  <tr key={c.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-zinc-900">{c.name}</td>
                    <td className="py-2.5 px-4 font-mono text-zinc-500">{c.phone || '—'}</td>
                    <td className="py-2.5 px-4 text-left font-mono font-medium text-zinc-800">
                      {c.totalPurchases.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-medium text-emerald-700">
                      {c.totalPaid.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-bold">
                      {hasDebt ? (
                        <span className="text-amber-700">{c.balance.toLocaleString('en-US')} ج.م</span>
                      ) : (
                        <span className="text-zinc-400 font-normal">خالص</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {hasDebt && (
                          <button
                            type="button"
                            onClick={() => setPayingCustomer(c)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            سداد
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setStatementCustomer(c)}
                          className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded text-[11px] font-medium cursor-pointer"
                        >
                          كشف حساب
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="p-1 text-zinc-400 hover:text-zinc-800 rounded cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded cursor-pointer"
                          title="حذف"
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
                  <td colSpan={6} className="py-8 text-center text-zinc-400 text-xs">
                    لا يوجد عملاء
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-xs font-bold text-zinc-900">
                {editingCustomer ? 'تعديل بيانات العميل' : 'تسجيل عميل جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
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
