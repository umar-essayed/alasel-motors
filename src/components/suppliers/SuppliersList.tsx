import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Supplier, ShopSettings } from '../../types';
import {
  Truck,
  Plus,
  Search,
  Phone,
  MapPin,
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

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const suppliers = useLiveQuery(() => db.suppliers.reverse().sortBy('createdAt')) || [];

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase().trim();
    return !q || s.name.toLowerCase().includes(q) || s.phone.includes(q);
  });

  const totalOwedToSuppliers = suppliers.reduce((sum, s) => sum + s.balance, 0);
  const totalPurchased = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);

  const openAddModal = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setFormError('');
    setIsAddOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setPhone(s.phone);
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setFormError('');
    setIsAddOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('اسم المورد مطلوب');
      return;
    }
    if (!phone.trim()) {
      setFormError('رقم هاتف المورد مطلوب');
      return;
    }

    const now = new Date().toISOString();
    if (editingSupplier) {
      await db.suppliers.update(editingSupplier.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
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
        notes: notes.trim(),
        createdAt: now,
        updatedAt: now,
      });
    }
    setIsAddOpen(false);
  };

  const handleDelete = async (s: Supplier) => {
    if (s.balance > 0) {
      alert(`لا يمكن حذف المورد لأن له مستحقات متبقية بقيمة (${s.balance.toLocaleString('ar-EG')} ج.م)`);
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف المورد "${s.name}"؟`)) {
      await db.suppliers.delete(s.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                سجل الموردين وحسابات الاستيراد
              </h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {suppliers.length} مورد
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              متابعة دفعات استيراد المواتير ومستحقات مكاتب الاستيراد والموانئ
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>إضافة مورد جديد</span>
          </button>
        </div>

        {/* Totals cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي مشترياتنا من الموردين</span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {totalPurchased.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3">
            <span className="text-[11px] font-bold text-rose-900 block">إجمالي المستحق للموردين (ديون علينا)</span>
            <span className="text-xl font-bold text-rose-950 font-mono">
              {totalOwedToSuppliers.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم المورد، رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sup) => {
          const hasBalance = sup.balance > 0;

          return (
            <div
              key={sup.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {sup.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {sup.phone}
                    </div>
                  </div>
                  {hasBalance ? (
                    <span className="bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      له مستحقات
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      خالص الحساب
                    </span>
                  )}
                </div>

                {sup.address && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{sup.address}</span>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">إجمالي البضاعة الواردة:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {sup.totalPurchases.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">إجمالي المسدد له:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {sup.totalPaid.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                    <span className="text-slate-900">المتبقي له:</span>
                    <span className={`font-mono text-sm ${hasBalance ? 'text-rose-700 font-extrabold' : 'text-slate-600'}`}>
                      {sup.balance.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayingSupplier(sup)}
                    className="flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>سداد دفعة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatementSupplier(sup)}
                    className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>كشف حساب</span>
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(sup)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                    title="تعديل المورد"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sup)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    title="حذف المورد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {payingSupplier && (
        <SupplierPaymentModal
          supplier={payingSupplier}
          onClose={() => setPayingSupplier(null)}
          onPaymentSaved={() => {}}
        />
      )}

      {/* Statement Modal */}
      {statementSupplier && (
        <SupplierStatementModal
          supplier={statementSupplier}
          settings={settings}
          onClose={() => setStatementSupplier(null)}
        />
      )}

      {/* Add/Edit Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3.5">
              {formError && (
                <div className="bg-rose-50 text-rose-800 text-xs p-2.5 rounded-lg border border-rose-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة الحرمين لاستيراد المواتير"
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
                  placeholder="012XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المقر أو الميناء</label>
                <input
                  type="text"
                  placeholder="مثال: المنطقة الحرة - ميناء بورسعيد"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  placeholder="نوع المواتير الموردة، جمارك..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingSupplier ? 'حفظ التعديل' : 'إضافة المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
