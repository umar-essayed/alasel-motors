import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account } from '../types';

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-ahmed',
    name: 'أحمد مجدي',
    role: 'admin',
    roleTitle: 'مدير عام',
    pin: '2026',
    avatarColor: 'bg-zinc-800 text-white',
  },
  {
    id: 'acc-osama',
    name: 'أسامة',
    role: 'admin',
    roleTitle: 'مدير عام',
    pin: '2026',
    avatarColor: 'bg-zinc-800 text-white',
  },
];

interface AuthContextType {
  activeAccount: Account | null;
  accounts: Account[];
  loginWithPin: (accountId: string, pin: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAccount, setActiveAccount] = useState<Account | null>(() => {
    const saved = localStorage.getItem('el_wikalla_web_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const loginWithPin = (accountId: string, pin: string): boolean => {
    const acc = DEFAULT_ACCOUNTS.find((a) => a.id === accountId);
    if (!acc) return false;
    if (acc.pin === pin) {
      setActiveAccount(acc);
      localStorage.setItem('el_wikalla_web_user', JSON.stringify(acc));
      return true;
    }
    return false;
  };

  const logout = () => {
    setActiveAccount(null);
    localStorage.removeItem('el_wikalla_web_user');
  };

  return (
    <AuthContext.Provider value={{ activeAccount, accounts: DEFAULT_ACCOUNTS, loginWithPin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
