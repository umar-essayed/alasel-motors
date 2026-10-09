import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Account } from '../types';
import logoImg from '../assets/logo.png';
import { Delete, Lock } from 'lucide-react';

export const MobileLoginView: React.FC = () => {
  const { accounts, loginWithPin } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4 && selectedAccount) {
        verifyPin(nextPin, selectedAccount.id);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const verifyPin = (pinToTest: string, accountId: string) => {
    const success = loginWithPin(accountId, pinToTest);
    if (!success) {
      setError('رمز PIN غير صحيح');
      setTimeout(() => setPin(''), 400);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between items-center px-4 py-8 select-none">
      {/* Brand Header */}
      <div className="text-center pt-4">
        <img src={logoImg} alt="الوكالة موتورز" className="w-16 h-16 mx-auto object-contain mb-3 drop-shadow-md" />
        <h1 className="text-2xl font-bold tracking-tight text-white">الوكالة موتورز</h1>
        <p className="text-xs text-zinc-400 mt-1">النسخة السحابية السريعة للهاتف والويب</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {!selectedAccount ? (
          <div>
            <p className="text-center text-xs text-zinc-400 mb-4 font-medium">اختر الحساب لتسجيل الدخول</p>
            <div className="grid grid-cols-2 gap-3">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccount(acc);
                    setPin('');
                    setError('');
                  }}
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2 text-center active:scale-95 transition-transform cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-lg text-amber-500">
                    {acc.name.slice(0, 1)}
                  </div>
                  <div>
                    <span className="font-bold text-sm block text-zinc-100">{acc.name}</span>
                    <span className="text-[11px] text-zinc-400 block">{acc.roleTitle}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-3 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center font-bold text-amber-500">
                  {selectedAccount.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{selectedAccount.name}</h3>
                  <p className="text-[11px] text-zinc-400">أدخل رمز الدخول (PIN)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedAccount(null);
                  setPin('');
                  setError('');
                }}
                className="text-xs text-amber-500 font-semibold px-2 py-1 hover:underline"
              >
                تغيير
              </button>
            </div>

            {/* PIN indicators */}
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    idx < pin.length
                      ? 'bg-amber-500 scale-110 shadow-xs'
                      : 'border border-zinc-700 bg-zinc-900'
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-xs text-rose-500 font-medium">{error}</p>
            )}

            {/* PIN Keypad */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDigit(digit)}
                  className="h-14 bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-800 border border-zinc-850 rounded-xl text-xl font-bold font-mono text-zinc-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  {digit}
                </button>
              ))}
              <div className="flex items-center justify-center">
                <Lock className="w-5 h-5 text-zinc-600" />
              </div>
              <button
                onClick={() => handleDigit('0')}
                className="h-14 bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-800 border border-zinc-850 rounded-xl text-xl font-bold font-mono text-zinc-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="h-14 bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-800 border border-zinc-850 rounded-xl text-zinc-400 flex items-center justify-center cursor-pointer transition-colors"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-zinc-600">
        الوكالة موتورز • الإصدار السحابي PWA
      </div>
    </div>
  );
};
