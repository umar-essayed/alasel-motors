import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Account, UserRole } from '../../types';
import { X, UserPlus, KeyRound, Shield, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { db } from '../../db';

interface AccountsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountsManagementModal: React.FC<AccountsManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { accounts, currentAccount, addAccount, updateAccountPin } = useAuth();
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New account form
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [roleTitle, setRoleTitle] = useState('مسؤول مبيعات');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Editing PIN
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('اسم الحساب مطلوب');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('الرقم السري يجب أن يتكون من 4 أرقام');
      return;
    }

    await addAccount({
      name: name.trim(),
      role,
      roleTitle,
      pin,
      avatarColor: 'bg-slate-800 text-white',
    });

    setName('');
    setPin('');
    setIsAddingNew(false);
    setError('');
  };

  const handleSavePin = async (accId: string) => {
    if (!/^\d{4}$/.test(newPin)) {
      alert('الرقم السري يجب أن يكون 4 أرقام');
      return;
    }
    await updateAccountPin(accId, newPin);
    setEditingAccountId(null);
    setNewPin('');
  };

  const handleDelete = async (acc: Account) => {
    if (acc.id === currentAccount?.id) {
      alert('لا يمكنك حذف الحساب الذي تستخدمه حالياً');
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف حساب "${acc.name}"؟`)) {
      await db.accounts.delete(acc.id);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">إدارة حسابات ومسؤولي النظام</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الحسابات المسجلة ({accounts.length})</span>
            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingNew ? 'إلغاء' : '+ إضافة مستخدم جديد'}</span>
            </button>
          </div>

          {/* Add form */}
          {isAddingNew && (
            <form onSubmit={handleCreate} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 text-xs">
              {error && <div className="text-rose-600 font-bold">{error}</div>}
              <div>
                <label className="font-bold text-slate-700 block mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م/ كريم عبد العزيز"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الدور / الصلاحية</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setRole(r);
                      if (r === 'admin') setRoleTitle('مدير عام');
                      else if (r === 'sales') setRoleTitle('مسؤول مبيعات');
                      else if (r === 'inventory') setRoleTitle('أمين مخزن');
                      else setRoleTitle('محاسب');
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="sales">مسؤول مبيعات وكاشير</option>
                    <option value="inventory">أمين مخزن</option>
                    <option value="accountant">محاسب مالي</option>
                    <option value="admin">مدير عام (تحكم كامل)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الرقم السري (4 أرقام) *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-center font-bold tracking-widest text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          )}

          {/* Accounts list */}
          <div className="divide-y divide-slate-100">
            {accounts.map((acc) => (
              <div key={acc.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{acc.name}</h4>
                  <span className="text-[11px] text-slate-400">{acc.roleTitle}</span>
                </div>

                <div className="flex items-center gap-2">
                  {editingAccountId === acc.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="PIN"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-16 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePin(acc.id)}
                        className="p-1 bg-emerald-600 text-white rounded text-xs cursor-pointer"
                        title="حفظ"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccountId(null)}
                        className="p-1 bg-slate-200 text-slate-600 rounded text-xs cursor-pointer"
                        title="إلغاء"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAccountId(acc.id);
                        setNewPin('');
                      }}
                      className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-1 rounded font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3 text-slate-400" />
                      <span>تغيير الرمز</span>
                    </button>
                  )}

                  {acc.id !== currentAccount?.id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(acc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="حذف الحساب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
