import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Account } from '../../types';
import { ArrowLeft, Delete, AlertCircle } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

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
      } else if (e.key === 'Enter' && pin.length === 4) {
        submitPin(pin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAccount, pin]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="text-center mb-6">
        <BrandLogo className="w-16 h-16 mx-auto object-contain mb-3" />
        <h1 className="text-xl font-bold tracking-tight text-white">
          الوكالة موتورز
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">نظام إدارة المحركات والمبيعات</p>
      </div>

      {!selectedAccount ? (
        <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-2xl">
          <p className="text-xs font-semibold text-zinc-400 text-center mb-4">
            اختر المستخدم
          </p>

          <div className="space-y-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  setSelectedAccount(acc);
                  setPin('');
                  setError('');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-600 transition-colors text-right cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-700 text-white flex items-center justify-center font-bold text-sm">
                    {acc.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-100 text-sm block">
                      {acc.name}
                    </span>
                    <span className="text-[11px] text-zinc-400 block">{acc.roleTitle}</span>
                  </div>
                </div>

                <ArrowLeft className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xs bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-800">
            <div>
              <h3 className="font-bold text-white text-sm">{selectedAccount.name}</h3>
              <p className="text-[11px] text-zinc-400">{selectedAccount.roleTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedAccount(null);
                setPin('');
                setError('');
              }}
              className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 cursor-pointer"
            >
              تغيير
            </button>
          </div>

          <div className="flex flex-col items-center mb-5">
            <div className="flex items-center gap-2.5 dir-ltr my-2">
              {[0, 1, 2, 3].map((i) => {
                const filled = pin.length > i;
                return (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      filled ? 'bg-white' : 'bg-zinc-800 border border-zinc-700'
                    }`}
                  />
                );
              })}
            </div>

            {error && (
              <div className="text-xs text-rose-400 mt-2 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={isSubmitting}
                className="h-11 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-white font-mono text-base font-semibold transition-colors cursor-pointer active:scale-95 border border-zinc-700/50"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting}
              className="h-11 rounded-lg bg-zinc-800/40 text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isSubmitting}
              className="h-11 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-white font-mono text-base font-semibold transition-colors cursor-pointer active:scale-95 border border-zinc-700/50"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="h-11 rounded-lg bg-zinc-800/40 text-zinc-400 hover:text-rose-400 flex items-center justify-center cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
