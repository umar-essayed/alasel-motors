import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Account, UserRole } from '../../types';
import { X, UserPlus, KeyRound, Shield, Trash2, CheckCircle2 } from 'lucide-react';
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

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [roleTitle, setRoleTitle] = useState('كاشير');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('اسم المستخدم مطلوب');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('الرمز السري يجب أن يتكون من 4 أرقام');
      return;
    }

    await addAccount({
      name: name.trim(),
      role,
      roleTitle,
      pin,
      avatarColor: 'bg-zinc-800 text-white',
    });

    setName('');
    setPin('');
    setIsAddingNew(false);
    setError('');
  };

  const handleSavePin = async (accId: string) => {
    if (!/^\d{4}$/.test(newPin)) {
      alert('الرمز السري يجب أن يتكون من 4 أرقام');
      return;
    }
    await updateAccountPin(accId, newPin);
    setEditingAccountId(null);
    setNewPin('');
  };

  const handleDelete = async (acc: Account) => {
    if (acc.id === currentAccount?.id) {
      alert('لا يمكن حذف الحساب الحالي المسجل به');
      return;
    }
    if (window.confirm(`تأكيد حذف حساب "${acc.name}"؟`)) {
      await db.accounts.delete(acc.id);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-zinc-200">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-400" />
            <h3 className="font-bold text-sm">إدارة المستخدمين والصلاحيات</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-500">المستخدمين المسجلين ({accounts.length})</span>
            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="font-semibold text-zinc-900 hover:text-zinc-600 flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddingNew ? 'إلغاء' : '+ مستخدم جديد'}</span>
            </button>
          </div>

          {/* Add form */}
          {isAddingNew && (
            <form onSubmit={handleCreate} className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-xl space-y-2.5">
              {error && <div className="text-rose-600 font-semibold">{error}</div>}
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">الاسم *</label>
                <input
                  type="text"
                  required
                  placeholder="الاسم الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">الصلاحية</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setRole(r);
                      setRoleTitle(r === 'admin' ? 'مدير' : 'كاشير');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs"
                  >
                    <option value="sales">كاشير</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">الرمز (4 أرقام) *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg font-mono text-center tracking-widest text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg cursor-pointer"
                >
                  حفظ
                </button>
              </div>
            </form>
          )}

          {/* Accounts list */}
          <div className="divide-y divide-zinc-100">
            {accounts.map((acc) => (
              <div key={acc.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-zinc-900 text-xs">{acc.name}</h4>
                  <span className="text-[11px] text-zinc-400">{acc.roleTitle}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {editingAccountId === acc.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="PIN"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-14 px-1.5 py-1 border border-zinc-300 rounded font-mono text-center text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePin(acc.id)}
                        className="p-1 bg-zinc-900 text-white rounded text-xs cursor-pointer"
                        title="حفظ"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccountId(null)}
                        className="p-1 bg-zinc-200 text-zinc-600 rounded text-xs cursor-pointer"
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
                      className="text-[11px] text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3 text-zinc-400" />
                      <span>تغيير الرمز</span>
                    </button>
                  )}

                  {acc.id !== currentAccount?.id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(acc)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded cursor-pointer"
                      title="حذف"
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
