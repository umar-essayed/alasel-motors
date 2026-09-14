import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Account } from '../../types';
import { Shield, UserCheck, KeyRound, ArrowRight, Delete, AlertCircle, Wrench, FileText, Banknote, Warehouse } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { accounts, loginWithPin } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle number pad button clicks
  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (newPin.length === 4) {
        submitPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const submitPin = async (pinToSubmit: string) => {
    if (!selectedAccount) return;
    setIsSubmitting(true);
    const success = await loginWithPin(selectedAccount.id, pinToSubmit);
    setIsSubmitting(false);
    if (!success) {
      setError('الرقم السري غير صحيح، حاول مرة أخرى');
      setPin('');
    }
  };

  // Listen to physical keyboard typing
  useEffect(() => {
    if (!selectedAccount) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        setSelectedAccount(null);
        setPin('');
        setError('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAccount, pin]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-5 h-5 text-amber-500" />;
      case 'sales':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'inventory':
        return <Warehouse className="w-5 h-5 text-emerald-500" />;
      case 'accountant':
        return <Banknote className="w-5 h-5 text-purple-500" />;
      default:
        return <UserCheck className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Subtle clean background header */}
      <div className="w-full max-w-2xl mx-auto text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 shadow-md mb-4 text-amber-400">
          <Wrench className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
          الأصيل موتورز
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          نظام إدارة مكن ومواتير السيارات • الحسابات • الإفراج الجمركي
        </p>
      </div>

      {!selectedAccount ? (
        /* ACCOUNT SELECTION VIEW */
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
          <div className="text-center mb-6 border-b border-slate-800/80 pb-4">
            <h2 className="font-display text-xl font-bold text-slate-100">
              تسجيل الدخول — اختر حسابك
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              اختر الحساب المصرح به ثم أدخل الرقم السري المكون من 4 أرقام
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  setSelectedAccount(acc);
                  setPin('');
                  setError('');
                }}
                className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400/50 transition-all text-right group cursor-pointer"
              >
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/60 group-hover:border-slate-600 transition-colors">
                  {getRoleIcon(acc.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-100 text-sm group-hover:text-amber-400 transition-colors truncate">
                    {acc.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    {acc.roleTitle}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    الرمز الافتراضي: <span className="text-slate-300 font-bold">{acc.pin}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            يعمل محلياً بالكامل (Offline First) مع دعم المزامنة السحابية
          </div>
        </div>
      ) : (
        /* PIN ENTRY VIEW */
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                {getRoleIcon(selectedAccount.role)}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  {selectedAccount.name}
                </h3>
                <p className="text-xs text-slate-400">{selectedAccount.roleTitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedAccount(null);
                setPin('');
                setError('');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>تغيير</span>
            </button>
          </div>

          {/* PIN Indicators */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>أدخل الرقم السري (4 أرقام)</span>
            </div>
            <div className="flex items-center gap-3 dir-ltr">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      isFilled
                        ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-3 font-medium animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Clean Tactile Keypad */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={isSubmitting}
                className="h-13 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 hover:border-slate-600 text-white font-bold text-xl active:scale-95 transition-all cursor-pointer font-mono"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting}
              className="h-13 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer"
            >
              مسح الكل
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isSubmitting}
              className="h-13 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 hover:border-slate-600 text-white font-bold text-xl active:scale-95 transition-all cursor-pointer font-mono"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="h-13 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center text-[11px] text-slate-400 mt-2">
            يمكنك أيضاً إدخال الأرقام مباشرة من لوحة المفاتيح
          </div>
        </div>
      )}
    </div>
  );
};
