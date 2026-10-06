import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Supplier, ShopSettings } from '../../types';
import { exportToCsv } from '../../utils/exportUtils';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Download,
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
    if (!name.trim()) {
      setFormError('اسم المورد مطلوب');
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
      alert(`لا يمكن حذف المورد لأن له رصيد متبقي (${s.balance.toLocaleString('en-US')} ج.م)`);
      return;
    }
    if (window.confirm(`تأكيد حذف المورد "${s.name}"؟`)) {
      await db.suppliers.delete(s.id);
    }
  };

  const handleExportCsv = () => {
    const headers = ['اسم المورد', 'الهاتف', 'العنوان', 'إجمالي المشتريات منه', 'إجمالي المسدد له', 'المستحق له في ذمتنا'];
    const rows = filtered.map((s) => [
      s.name,
      s.phone,
      s.address || '—',
      s.totalPurchases,
      s.totalPaid,
      s.balance,
    ]);
    exportToCsv('موردي_الأصيل_موتورز', headers, rows);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-900">سجل الموردين</h2>
            <span className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-semibold">
              {suppliers.length} مورد
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            مستحقات الموردين: {totalOwed.toLocaleString('en-US')} ج.م
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
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مورد</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="بحث باسم المورد أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">اسم المورد</th>
                <th className="py-2.5 px-4">الهاتف</th>
                <th className="py-2.5 px-4 text-left">إجمالي المشتريات</th>
                <th className="py-2.5 px-4 text-left">المسدد له</th>
                <th className="py-2.5 px-4 text-left">المتبقي له</th>
                <th className="py-2.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((s) => {
                const hasBalance = s.balance > 0;

                return (
                  <tr key={s.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-zinc-900">{s.name}</td>
                    <td className="py-2.5 px-4 font-mono text-zinc-500">{s.phone || '—'}</td>
                    <td className="py-2.5 px-4 text-left font-mono font-medium text-zinc-800">
                      {s.totalPurchases.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-medium text-emerald-700">
                      {s.totalPaid.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-bold">
                      {hasBalance ? (
                        <span className="text-amber-700">{s.balance.toLocaleString('en-US')} ج.م</span>
                      ) : (
                        <span className="text-zinc-400 font-normal">خالص</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {hasBalance && (
                          <button
                            type="button"
                            onClick={() => setPayingSupplier(s)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            سداد دفعة
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setStatementSupplier(s)}
                          className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded text-[11px] font-medium cursor-pointer"
                        >
                          كشف حساب
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="p-1 text-zinc-400 hover:text-zinc-800 rounded cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
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
                    لا يوجد موردين
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-xs font-bold text-zinc-900">
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
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
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم المورد *</label>
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
                  onClick={() => setIsAddOpen(false)}
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
