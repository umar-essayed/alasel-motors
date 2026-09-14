import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { syncService, SyncStatus } from '../../services/syncService';
import {
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  LogOut,
  PlusCircle,
  Wrench,
  Search,
  User,
} from 'lucide-react';

interface NavbarProps {
  onOpenSyncSettings: () => void;
  onOpenNewEngineModal: () => void;
  onQuickSearch: (query: string) => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSyncSettings,
  onOpenNewEngineModal,
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
          title="جاري المزامنة مع سحابة Firebase"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span className="hidden sm:inline">جاري المزامنة...</span>
        </button>
      );
    }
    if (syncStatus.state === 'synced' || syncStatus.state === 'idle') {
      return (
        <button
          onClick={onOpenSyncSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
          title={syncStatus.message}
        >
          <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">سحابي متصل</span>
        </button>
      );
    }
    return (
      <button
        onClick={onOpenSyncSettings}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer hover:bg-slate-200 transition-colors"
        title="يعمل محلياً في المتصفح Offline-First عبر IndexedDB"
      >
        <CloudOff className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden sm:inline">محلي (Offline)</span>
      </button>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-lg sm:text-xl text-slate-900 tracking-tight block leading-tight">
                الأصيل موتورز
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                مواتير ومكن سيارات استيراد
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="ابحث برقم المكنة، الماركة (إلنترا، سيراتو)، أو العميل..."
                value={searchQuery}
                onChange={(e) => onQuickSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 focus:border-slate-800 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-800 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => onQuickSearch('')}
                  className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons & User */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Add Engine Button */}
            <button
              type="button"
              onClick={onOpenNewEngineModal}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">إضافة مكنة</span>
            </button>

            {/* Cloud Sync Status Badge */}
            {getSyncBadge()}

            {/* Quick Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer hidden md:flex items-center"
              title="مزامنة الآن مع السحابة"
            >
              <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Current Account Profile & Switch */}
            {currentAccount && (
              <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentAccount.name.split('(')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {currentAccount.roleTitle}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                  title="تبديل الحساب أو تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">تبديل الحساب</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
