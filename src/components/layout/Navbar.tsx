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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          {/* Logo & Shop Name */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/logo.png"
              alt="الأصيل موتورز"
              className="w-12 h-12 object-contain rounded-xl"
            />
            <div>
              <span className="font-display font-bold text-xl text-slate-900 leading-none block">
                الأصيل موتورز
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                مواتير ومكن سيارات استيراد • قطع غيار
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث برقم المكنة المدموغ (G4FC...) أو الموديل..."
                value={searchQuery}
                onChange={(e) => onQuickSearch(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Right Action Buttons & User */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick POS button */}
            <button
              type="button"
              onClick={onOpenPos}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span>شاشة البيع (POS)</span>
            </button>

            {/* Quick Add Engine */}
            <button
              type="button"
              onClick={onOpenNewEngineModal}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold px-3.5 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إضافة مكنة</span>
            </button>

            {/* Sync Badge */}
            {getSyncBadge()}

            {/* User Chip */}
            {currentAccount && (
              <div className="flex items-center gap-2.5 pr-2 border-r border-slate-200">
                <span className="text-sm font-bold text-slate-800 hidden md:block">
                  {currentAccount.name.split('(')[0]}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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
