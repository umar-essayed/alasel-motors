import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Supplier, ShopSettings } from '../../types';
import {
  Truck,
  Plus,
  Search,
  SendHorizontal,
  FileText,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { SupplierStatementModal } from './SupplierStatementModal';

interface SuppliersListProps {
  settings: ShopSettings;
}

export const SuppliersList: React.FC<SuppliersListProps> = ({ settings }) => {
  const [search, setSearch] = useState('');
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  const suppliers = useLiveQuery(() => db.suppliers.reverse().sortBy('createdAt')) || [];

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase().trim();
    return !q || s.name.toLowerCase().includes(q) || s.phone.includes(q);
  });

  const totalOwed = suppliers.reduce((sum, s) => sum + s.balance, 0);

  const openAdd = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setAddress('');
    setFormError('');
    setIsAddOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setPhone(s.phone);
    setAddress(s.address || '');
    setFormError('');
    setIsAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setFormError('الاسم ورقم الهاتف مطلوبين');
      return;
    }

    const now = new Date().toISOString();
    if (editingSupplier) {
      await db.suppliers.update(editingSupplier.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        updatedAt: now,
      });
    } else {
      await db.suppliers.add({
        id: `sup-${Date.now()}`,
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
    setIsAddOpen(false);
  };

  const handleDelete = async (s: Supplier) => {
    if (s.balance > 0) {
      alert(`لا يمكن حذف المورد لأن له مستحقات متبقية (${s.balance.toLocaleString('en-US')} ج.م)`);
      return;
    }
    if (window.confirm(`حذف المورد "${s.name}"؟`)) {
      await db.suppliers.delete(s.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">سجل الموردين والاستيراد</h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {suppliers.length} مورد
            </span>
          </div>
          <span className="text-xs text-slate-400">مستحقات الموردين: {totalOwed.toLocaleString('en-US')} ج.م</span>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم المورد أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Table of Suppliers */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">اسم المورد</th>
                <th className="py-3 px-4">رقم الهاتف</th>
                <th className="py-3 px-4">الميناء / المقر</th>
                <th className="py-3 px-4 text-left">إجمالي المشتريات منه</th>
                <th className="py-3 px-4 text-left">إجمالي المسدد له</th>
                <th className="py-3 px-4 text-left">المستحق له</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const hasBalance = s.balance > 0;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{s.phone}</td>
                    <td className="py-3.5 px-4 text-slate-500">{s.address || 'غير محدد'}</td>
                    <td className="py-3.5 px-4 text-left font-mono font-semibold text-slate-800">
                      {s.totalPurchases.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-semibold text-emerald-700">
                      {s.totalPaid.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-bold">
                      {hasBalance ? (
                        <span className="text-rose-700">{s.balance.toLocaleString('en-US')} ج.م</span>
                      ) : (
                        <span className="text-slate-400 font-normal">خالص</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPayingSupplier(s)}
                          className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          سداد دفعة
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatementSupplier(s)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          كشف حساب
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
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
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    لا يوجد موردين يطابقون البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payingSupplier && (
        <SupplierPaymentModal
          supplier={payingSupplier}
          onClose={() => setPayingSupplier(null)}
          onPaymentSaved={() => {}}
        />
      )}

      {statementSupplier && (
        <SupplierStatementModal
          supplier={statementSupplier}
          settings={settings}
          onClose={() => setStatementSupplier(null)}
        />
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              {formError && <div className="text-rose-600 text-xs font-bold">{formError}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد / الشركة *</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">المقر أو الميناء</label>
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
                  onClick={() => setIsAddOpen(false)}
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
