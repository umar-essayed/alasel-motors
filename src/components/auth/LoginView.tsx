import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Account } from '../../types';
import { KeyRound, ArrowRight, Delete, AlertCircle, Shield, UserCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { accounts, loginWithPin } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
      setError('الرمز السري غير صحيح');
      setPin('');
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      {/* Header with official logo */}
      <div className="text-center mb-8">
        <img
          src="/logo.png"
          alt="الأصيل موتورز"
          className="w-20 h-20 mx-auto object-contain mb-3 drop-shadow-md"
        />
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
          الأصيل موتورز
        </h1>
        <p className="text-xs text-slate-400 mt-1">نظام إدارة المحركات والحسابات</p>
      </div>

      {!selectedAccount ? (
        /* ACCOUNT PICKER */
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center mb-5">
            اختر حساب المستخدم للمتابعة
          </h2>

          <div className="space-y-2.5">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  setSelectedAccount(acc);
                  setPin('');
                  setError('');
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all text-right cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-sm group-hover:border-amber-400/40 transition-colors">
                    {acc.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-100 text-sm block group-hover:text-amber-400 transition-colors">
                      {acc.name}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{acc.roleTitle}</span>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors rotate-180" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* PIN ENTRY */
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">{selectedAccount.name}</h3>
              <p className="text-[11px] text-slate-400">{selectedAccount.roleTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedAccount(null);
                setPin('');
                setError('');
              }}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
            >
              رجوع
            </button>
          </div>

          {/* Dots */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-3 dir-ltr my-3">
              {[0, 1, 2, 3].map((i) => {
                const filled = pin.length > i;
                return (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      filled
                        ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <div className="text-xs text-rose-400 mt-2 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={isSubmitting}
                className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold font-mono text-lg transition-all cursor-pointer active:scale-95 border border-slate-700/60"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-slate-800/40 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold font-mono text-lg transition-all cursor-pointer active:scale-95 border border-slate-700/60"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-slate-800/40 text-slate-400 hover:text-rose-400 flex items-center justify-center cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
