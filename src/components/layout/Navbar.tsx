import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { syncService, SyncStatus } from '../../services/syncService';
import {
  CloudCheck,
  CloudOff,
  RefreshCw,
  LogOut,
  Plus,
  Search,
  ShoppingCart,
} from 'lucide-react';

interface NavbarProps {
  onOpenSyncSettings: () => void;
  onOpenNewEngineModal: () => void;
  onOpenPos: () => void;
  onQuickSearch: (query: string) => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSyncSettings,
  onOpenNewEngineModal,
  onOpenPos,
  onQuickSearch,
  searchQuery,
}) => {
  const { currentAccount, logout } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'offline',
    message: 'محلي (IndexedDB)',
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await syncService.syncNow();
    setIsManualSyncing(false);
  };

  const getSyncBadge = () => {
    if (isManualSyncing || syncStatus.state === 'syncing') {
      return (
        <button
          onClick={onOpenSyncSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span className="hidden md:inline">مزامنة...</span>
        </button>
      );
    }
    if (syncStatus.state === 'synced' || syncStatus.state === 'idle') {
      return (
        <button
          onClick={onOpenSyncSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer"
          title={syncStatus.message}
        >
          <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">سحابي</span>
        </button>
      );
    }
    return (
      <button
        onClick={onOpenSyncSettings}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
      >
        <CloudOff className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden md:inline">أوفلاين</span>
      </button>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Shop Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/logo.png"
              alt="الأصيل موتورز"
              className="w-10 h-10 object-contain rounded-xl"
            />
            <div>
              <span className="font-display font-bold text-lg text-slate-900 leading-none block">
                الأصيل موتورز
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                مواتير ومكن سيارات استيراد
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex-1 max-w-sm mx-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم المكنة أو الموديل..."
                value={searchQuery}
                onChange={(e) => onQuickSearch(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Right Action Buttons & User */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick POS button */}
            <button
              type="button"
              onClick={onOpenPos}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">شاشة البيع</span>
            </button>

            {/* Quick Add Engine */}
            <button
              type="button"
              onClick={onOpenNewEngineModal}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مكنة جديدة</span>
            </button>

            {/* Sync Badge */}
            {getSyncBadge()}

            {/* User Chip */}
            {currentAccount && (
              <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
                <span className="text-xs font-bold text-slate-800 hidden md:block">
                  {currentAccount.name.split('(')[0]}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="تسجيل الخروج / تبديل الحساب"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
