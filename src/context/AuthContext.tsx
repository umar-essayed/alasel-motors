import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, UserRole } from '../types';
import { db } from '../db';

interface AuthContextType {
  currentAccount: Account | null;
  accounts: Account[];
  isLoading: boolean;
  loginWithPin: (accountId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => Promise<void>;
  updateAccountPin: (accountId: string, newPin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAccounts = async () => {
    try {
      const allAccounts = await db.accounts.toArray();
      setAccounts(allAccounts);
      
      // Check if session stored
      const savedAccountId = sessionStorage.getItem('alasel_active_account_id');
      if (savedAccountId) {
        const found = allAccounts.find(a => a.id === savedAccountId);
        if (found) {
          setCurrentAccount(found);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const loginWithPin = async (accountId: string, pin: string): Promise<boolean> => {
    const acc = await db.accounts.get(accountId);
    if (!acc) return false;
    if (acc.pin === pin) {
      setCurrentAccount(acc);
      sessionStorage.setItem('alasel_active_account_id', acc.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentAccount(null);
    sessionStorage.removeItem('alasel_active_account_id');
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentAccount) return false;
    if (currentAccount.role === 'admin') return true; // Admin has all permissions
    return roles.includes(currentAccount.role);
  };

  const addAccount = async (accountData: Omit<Account, 'id' | 'createdAt'>) => {
    const newAcc: Account = {
      ...accountData,
      id: `acc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await db.accounts.add(newAcc);
    await loadAccounts();
  };

  const updateAccountPin = async (accountId: string, newPin: string) => {
    await db.accounts.update(accountId, { pin: newPin });
    await loadAccounts();
  };

  return (
    <AuthContext.Provider
      value={{
        currentAccount,
        accounts,
        isLoading,
        loginWithPin,
        logout,
        hasRole,
        addAccount,
        updateAccountPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
